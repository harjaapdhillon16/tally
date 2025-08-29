## Milestone 3 — Categorization v0 (Hybrid)

This document explains the hybrid categorization system added in Milestone 3. It covers the architecture, data model, modules, API, jobs, UI, observability, guardrails, testing, and operations. The implementation follows our existing monorepo conventions and analytics wrappers.

### Quick summary

- Deterministic Pass-1 heuristics run first (MCC, vendor alias rules, recurring patterns, neighbor boost from embeddings).
- Only if Pass-1 is not confident (< 0.85) do we use the LLM scorer (Pass-2), with strict token and logging policies.
- A decisioning layer writes `transactions.category_id`, confidence, and `needs_review` flag and records an audit in `decisions`.
- Manual corrections create rules for future learning.
- A weekly job refreshes vendor embeddings to improve Pass-1.
- The UI shows confidence, rationales, and provides review actions.

---

## Architecture overview

- Libraries: `packages/categorizer` exposes Pass-1 and Pass-2 functions and shared types.
- Services: `services/categorizer/apply.ts` encapsulates decisioning and audit write.
- Web API: `apps/web/src/app/api/transactions/correct/route.ts` handles corrections and rule upsert.
- Edge Jobs: `apps/edge/jobs/categorize-queue` (daily/continuous) and `apps/edge/jobs/embeddings-refresh` (weekly schedule).
- Analytics: `packages/analytics` used for Langfuse, PostHog, and Sentry throughout.

### Data contracts

- NormalizedTransaction (conceptual):
  - `id`, `org_id`, `raw`, `merchant_name`, `mcc`, `amount_cents` (string), `date`, `category_id?`, `confidence?`, `reviewed?`, `needs_review?`, `rationale?[]`
- CategorizationResult: `{ category_id?: string, confidence?: number, rationale: string[] }`
- Context: DB client, analytics, logger, org caches/config.

---

## Data model changes (migrations)

All migrations live in `packages/db/migrations/`. For convenience, the relevant SQL is included below.

### 1) Transactions review flag

```sql
alter table transactions
  add column if not exists needs_review boolean default false;
```

### 2) Decisions audit table

```sql
create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  tx_id uuid not null,
  source text not null check (source in ('pass1','llm')),
  confidence numeric not null,
  rationale jsonb not null,
  decided_by text not null default 'system',
  created_at timestamptz not null default now()
);
create index if not exists idx_decisions_tx on decisions(tx_id);
```

### 3) Corrections table

```sql
create table if not exists corrections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  tx_id uuid not null,
  old_category_id uuid,
  new_category_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_corrections_org on corrections(org_id);
create index if not exists idx_corrections_tx on corrections(tx_id);
```

### 4) Rules table (if not present)

```sql
create table if not exists rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  pattern jsonb not null, -- {vendor: string, mcc?: string, desc_tokens?: string[]}
  category_id uuid not null,
  weight numeric not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists idx_rules_org on rules(org_id);
```

### 5) Vendor embeddings (pgvector)

```sql
create extension if not exists vector;
create table if not exists vendor_embeddings (
  org_id uuid not null,
  vendor text not null,
  embedding vector(1536) not null,
  last_refreshed timestamptz not null default now(),
  primary key (org_id, vendor)
);
```

### 6) Helpful indexes

```sql
create index if not exists idx_rules_org on rules(org_id);
create index if not exists idx_tx_org_date on transactions(org_id, date desc);
```

---

## Modules

### Pass-1 deterministic — `packages/categorizer/src/pass1.ts`

Purpose: produce an explainable, cheap categorization candidate and confidence using:

- MCC mapping: `mcc → category_id` via static map or cached DB load
- Vendor alias rules: exact/ILIKE match on normalized `merchant_name` against `rules.pattern->>'vendor'`
- Recurring pattern rules: regex or signature from `rules.pattern`
- Embeddings neighbor boost: top-K nearest neighbors by `vendor_embeddings` majority vote

Rationale strings are accumulated for each signal, e.g. `"mcc: 5812 → Restaurants"`.

Signature:

```ts
export async function pass1Categorize(
  tx: NormalizedTransaction,
  ctx: CategorizationContext
): Promise<CategorizationResult>
```

Notes:

- Pure and side-effect-free (reads only)
- Confidence aggregation: strongest signal as base; small additive boosts; clamp ≤ 0.98
- Default confidence only when truly no signal; otherwise reflect evidence strength
- Caching: LRU caches for MCC map and vendor rules by org; TTL-based invalidation

### Pass-2 LLM scorer — `packages/categorizer/src/pass2_llm.ts`

Runs only if Pass-1 confidence < 0.85. Builds a compact prompt using:

- `{ merchant, description(≤160 chars), mcc, amount_cents (string), prior_category?, org_industry='salon' }`

It calls the model via the `packages/analytics/langfuse` wrapper, logs prompt/latency, and parses a normalized output:

```ts
export async function scoreWithLLM(
  tx: NormalizedTransaction,
  ctx: CategorizationContext
): Promise<{ category_id: string; confidence: number; rationale: string[] }>
```

Rules:

- Clamp confidence to [0, 1]; default to 0.5 on malformed output
- Map `category_slug` to `categories.id`; fallback to "Uncategorized" if not found
- Never override a high-confidence Pass-1 result
- Keep `amount_cents` as a string; do not parse floats in prompts

### Decisioning service — `services/categorizer/apply.ts`

Implements the policy: `confidence ≥ 0.85 → auto-apply`, else mark `needs_review=true`.

Responsibilities:

- Update `transactions.category_id`, `transactions.confidence`, `reviewed=false`
- If `< 0.85`, set `needs_review=true`
- Insert audit row into `decisions(tx_id, source, confidence, rationale, decided_by='system')`
- Emit PostHog events: `categorization_auto_applied` with `{confidence, source}` when auto-applied

Signature:

```ts
export async function decideAndApply(
  txId: string,
  result: CategorizationResult,
  source: 'pass1' | 'llm',
  ctx: CategorizationContext
): Promise<void>
```

### Corrections API — `apps/web/src/app/api/transactions/correct/route.ts`

Endpoint: `POST /api/transactions/correct`

Input:

```json
{ "tx_id": "uuid", "new_category_id": "uuid" }
```

Behavior:

1) Load the transaction (including `org_id`) and previous `category_id`
2) Update transaction to the new category; set `reviewed=true`, `needs_review=false`
3) Insert into `corrections(org_id, tx_id, old_category_id, new_category_id, user_id)`
4) Generate rule signature `{ vendor, mcc?, desc_tokens? }` from the transaction
5) Upsert into `rules(org_id, pattern, category_id)`; on repeated correction, increment `weight`
6) Emit PostHog event `categorization_corrected` with `{confidence, source}` if available

Notes:

- Vendor normalization uses the same logic as Pass-1
- Keep rules precise; start with vendor + optional mcc
- Respect feature flags if present (see below)

### Edge job — categorize queue — `apps/edge/jobs/categorize-queue`

Purpose: (re)categorize new or uncertain transactions.

Process:

- Select recent transactions `where category_id is null or needs_review=true`
- For each tx: run Pass-1 → if `< 0.85`, run Pass-2 → `decideAndApply`
- Emit Langfuse traces and per-org summary metrics
- Throttle per org; set small concurrency to control LLM usage
- Optional feature flag `CATEGORIZATION_LLM_ENABLED` to disable Pass-2

### Edge job — embeddings refresh — `apps/edge/jobs/embeddings-refresh`

Purpose: create/update embeddings for frequent vendors to fuel Pass-1 neighbor boost.

Process:

- Query distinct `merchant_name` per org with ≥ N occurrences (configurable)
- Normalize vendor; create embeddings via OpenAI (through analytics wrapper)
- Upsert into `vendor_embeddings(org_id, vendor, embedding, last_refreshed)`
- Log summary metrics per org

---

## UI trust layer

> **📋 Implementation Status: PENDING**  
> The UI trust layer will be implemented in a future task. The backend categorization engine and APIs are complete and ready to support the UI features described below.

In the transactions table rows:

- Show a category with a confidence pill (e.g., `92%`)
- A "Why?" popover lists all `rationale[]` strings from Pass-1/LLM
- If `needs_review=true`, highlight the row and show "Accept / Change" actions
- On change: call the corrections API, optimistically update, toast result
- Emit PostHog events for auto-applied and corrected decisions

Suggested prop shape:

```ts
type TxRowProps = {
  id: string;
  category: { id?: string; name?: string };
  confidence?: number;
  needsReview?: boolean;
  rationale?: string[];
};
```

### Required UI Components (To Be Implemented)

1. **Confidence Pill Component** - Visual indicator showing categorization confidence percentage
2. **Rationale Popover** - Expandable component displaying decision reasoning
3. **Review Actions** - Accept/Change buttons for transactions requiring manual review
4. **Toast Notifications** - Success/error feedback for correction actions
5. **Table Row Highlighting** - Visual emphasis for transactions needing review

---

## Observability

- Langfuse: trace prompts, model, latency, token counts (Pass-2) and job spans
- PostHog: events
  - `categorization_auto_applied` with `{confidence, source}`
  - `categorization_corrected` with `{confidence, source}`
- Sentry: capture exceptions in jobs, API, and scorers

All keys are provided via `.env` and loaded by shared config; never hardcode keys.

---

## Feature flags and constants

- A single feature flag is recommended: `CATEGORIZATION_LLM_ENABLED`
  - Check this flag in the queue job (and any manual bulk recategorization flows)
  - Store the flag name in a centralized enum/const object to avoid scattering

---

## Guardrails

- Keep amounts as cents (string) end-to-end; never parse to float for prompts
- Normalize vendor names (trim, lowercase, strip punctuation and LLC/Inc)
- Do not let LLM overwrite high-confidence Pass-1 matches
- Cap token usage; trim descriptions to ≤ 160 chars
- Detect oscillating vendors (flip-flop categories) and route to manual review

---

## Testing

Unit tests (vitest):

- Pass-1: MCC/vendor/pattern matches; rationale composition; aggregation
- Normalization and rule matching edge cases
- Pass-2: parsing/clamping; malformed outputs; mapping slugs → ids (mock DB)

Integration tests:

- `decideAndApply` correctly updates transactions and writes `decisions`
- Corrections API writes `corrections` and upserts/increments rule `weight`

E2E (Playwright):

- Transactions page renders confidence pill and Why popover
- Accept/Change flows update the table and show toasts

---

## Operations

- Scheduling
  - `categorize-queue`: frequent (e.g., every 5–10 minutes) or event-driven
  - `embeddings-refresh`: weekly (cron)
- Rollout
  1) Ship migrations and Pass-1 only; backfill
  2) Enable queue with Pass-1; validate metrics
  3) Enable LLM scorer behind `CATEGORIZATION_LLM_ENABLED` for test orgs
  4) Gradually expand; monitor latency, cost, accuracy
- Backfills
  - Use the queue job to (re)process historical uncategorized items

Environment/config:

- All analytics/LLM keys from `.env` via shared config utilities
- LLM model choice and token limits configured centrally

---

## Acceptance and metrics

- Accuracy: ≥ 90% baseline on salon taxonomy across seed data
- UI: Every decision shows a rationale
- Thresholding: Auto-apply ≥ 0.85; review queue contains only < 0.85
- Learning: Corrections generate rules; repeated vendor corrections increase weight
- Embeddings: Weekly refresh runs; neighbor boost visible in logs
- Analytics: Langfuse prompt/latency and PostHog correction funnel are populated

---

## FAQ

### Why keep amounts as cents strings?

Avoid floating-point precision errors and keep prompts consistent with ledger storage.

### What if LLM output is malformed?

We default to `confidence = 0.5` and fall back to "Uncategorized"; Sentry logs the exception and Langfuse records the span.

### How are vendor names normalized?

Lowercase, trim whitespace, strip punctuation and suffixes such as "llc" and "inc". The same normalizer is used in Pass-1, the queue job, and the corrections API.

### Can a single vendor map to multiple categories?

Yes; rules should favor the most common mapping via `weight`. Oscillation detection flags unstable vendors for review.

---

## Appendix: SQL helpers

```sql
-- Index helpers (safety for repeated runs)
create index if not exists idx_rules_org on rules(org_id);
create index if not exists idx_tx_org_date on transactions(org_id, date desc);
```


