## Test Suite Fixes — Implementation Plan (Categorizer Lab)

Purpose: Bring the categorizer lab test suite to green without affecting production behavior. This plan targets unit, API, and E2E failures identified during the root cause analysis.

Constraints:
- Keep the lab isolated (dev-only) and behind a single feature flag `CATEGORIZER_LAB_ENABLED` centralized in `apps/web/src/lib/flags.ts`.
- No production writes. No coupling with prod decisioning.
- Prefer deterministic behavior in tests; avoid non-deterministic randomness.

---

### 0) Pre-flight (already done or verify)
- Vitest globals: ensure `apps/web/vitest.config.ts` has `globals: true` and `environment: 'jsdom'`.
- Categorizer package is built and imported as `@nexus/categorizer` in the web app.

---

### 1) Data normalization fixes (mappers.ts)
Files:
- `apps/web/src/lib/categorizer-lab/mappers.ts`

Goals:
- Fix vendor extraction, amount normalization, and currency normalization to match tests.

Changes:
- Vendor extraction pipeline (function used in tests, e.g., `extractVendorFromDescription`):
  - Uppercase input; collapse whitespace; strip punctuation except spaces, `&`, `.`.
  - Remove known suffixes/tails: `AMZN.COM/BILL`, `POS`, `AUTH`, `CARD`, `REF`, `WEB`, `VISA`, `ONLINE`, `ECOM`, `EC`.
  - Remove boilerplate tokens: `PAYMENT`, `THANK`, `YOU`, `TRANSFER`, `DEBIT`, `CREDIT`.
  - Trim store numbers and trailing `#123`, `T-1234` patterns.
  - If the remaining token length < 3 or only boilerplate, return `undefined`.
  - Expectation: `'AMAZON.COM AMZN.COM/BILL' → 'AMAZON.COM'`; `'PAYMENT THANK YOU' → undefined`.
- Amount normalization (function used in tests, e.g., `validateAndNormalizeAmount`):
  - Accept `string | number`.
  - Remove `$`, `,`, spaces; detect sign; detect optional decimals.
  - Convert dollars to integer cents using integer math; always return string cents; preserve sign.
  - Ensure: `'123' → '12300'`, `'-50' → '-5000'`, `'123.45' → '12345'`, `123.45 → '12345'`, `'-$1,234.56' → '-123456'`.
- Currency normalization (helper used by CSV/JSON parsers):
  - Uppercase; default to `USD` if missing/empty.

Tests that should turn green:
- `mappers.spec.ts` vendor and amount tests.

---

### 2) Parsing ownership and error shape (parsers.ts)
Files:
- `apps/web/src/lib/categorizer-lab/parsers.ts`

Goals:
- Avoid double conversion of amounts and align error messaging.

Changes:
- Decide ownership: perform dollars→cents conversion in a single place. Recommended: in `validateAndNormalizeAmount` (mappers) invoked by parsers; ensure parsers do not re-convert already-cents values.
- CSV path:
  - Parse raw dollar amounts from CSV; pass to `validateAndNormalizeAmount` once.
  - Align expectations so amounts from CSV like `-5.00` yield `-500` not `-50000`.
- JSON path:
  - Normalize amounts similarly; support minimal required fields; default currencies/dates as per tests.
- Unsupported format error:
  - Before Zod parsing, validate `format in { 'json','csv' }`. If not, `throw new Error('Unsupported format')` to match test expectation.

Tests that should turn green:
- `parsers.spec.ts` CSV amount cases and unsupported format error.

---

### 3) Metrics precision and binning (metrics.ts)
Files:
- `apps/web/src/lib/categorizer-lab/metrics.ts`

Goals:
- Match percentile and histogram expectations; avoid FP drift in means.

Changes:
- Percentiles (p50/p95/p99):
  - Sort ascending latencies.
  - Use nearest-rank: `index = Math.ceil(p * n) - 1`, clamp to `[0, n-1]`.
- Confidence histogram:
  - Define bins: `[0.0,0.1) ... [0.9,1.0]`. Include 1.0 in last bin.
- Round displayed means:
  - For confidence mean, round to 2 decimals to avoid `0.8500000000000001`. Keep raw for internal calc if needed; round only in the returned metrics DTO.

Tests that should turn green:
- `metrics.spec.ts` latency and histogram tests; API route metrics precision test.

---

### 4) API route robustness (run/route.ts)
Files:
- `apps/web/src/app/api/dev/categorizer-lab/run/route.ts`

Goals:
- Proper per-transaction error handling and status classification.

Changes:
- Pass‑1 error handling:
  - Remove fallback mock on error inside `runPass1`; propagate the error so caller records it in `results` with `error` and continues batch.
- Pass‑2 without key:
  - In pass2-only or hybrid when key missing, return per-tx error entries; do not fail the whole request.
- Status policy:
  - success: `errors.length === 0`.
  - partial: `errors.length > 0` (even if all per-tx failed).
  - failed: reserved for request-level validation errors (e.g., invalid body schema).
- Confidence precision:
  - If API computes aggregate confidence mean, round to 2 decimals.

Tests that should turn green:
- `run/route.spec.ts` Pass‑1 error, Pass‑2 no key, metrics precision.

---

### 5) Page gating and flow (page.tsx)
Files:
- `apps/web/src/app/(dev)/categorizer-lab/page.tsx`
- `apps/web/src/lib/flags.ts` (centralized flag)

Goals:
- Ensure lab page reflects flag state and renders expected sections.

Changes:
- Feature flag gate:
  - On server, check `isCategorizerLabEnabled()`. If disabled, return `notFound()` (404). Keep API health route consistent.
- Headings/text:
  - Ensure exact headings present to match tests:
    - `1. Dataset`
    - `2. Configuration`
    - `3. Progress`
    - `4. Results`
- Flow:
  - After dataset load/generation, transition to show `Configuration`.
  - On run start, render `Progress` immediately.
  - On completion (even with per-tx errors), render `Categorization Complete` and `Results`.

Tests that should turn green:
- E2E specs verifying 404, headings, progress, and completion visibility.

---

### 6) UI filtering and file upload
Files:
- `apps/web/src/components/categorizer-lab/results-table.tsx`
- `apps/web/src/components/categorizer-lab/dataset-loader.tsx`

Goals:
- Make filtering and upload flows deterministic and testable.

Changes:
- Filtering:
  - Case-insensitive search over description, merchant/vendor, and category text.
  - Debounce to a very small value in tests or expose a manual `Apply` to make deterministic.
- File upload:
  - Ensure a visible `input[type="file"]` is present (or add `data-testid="file-input"`), and the onChange triggers parsing + state update.
  - Maintain accessibility and focus for Playwright selectors.

Tests that should turn green:
- E2E filter count assertions; E2E file upload scenario.

---

### 7) E2E runner health
Files:
- `apps/web/playwright.config.ts` (verify)

Goals:
- Ensure Next.js is running during tests and baseURL is correct.

Checks:
- `webServer` config starts Next.js app before tests, with correct port.
- Tests use consistent baseURL/navigation to `/(dev)/categorizer-lab`.

---

### 8) Test updates (when needed)
- Where tests expect string error `'Unsupported format'`, keep that surface exactly in the parser; do not alter tests unless business logic changes are unavoidable.
- For floating point expectations, prefer `toBeCloseTo` in tests; but primary fix is rounding in metrics to meet current strict assertions.

---

### Execution order (recommended)
1) Metrics (nearest-rank + histogram + rounding) — quick wins; stabilizes API expectation.
2) Parsers (ownership + errors) — resolves CSV/format failures.
3) Mappers (amount and vendor) — resolves several unit tests.
4) API route error handling + status policy — aligns API tests.
5) Page gating + headings + deterministic flow — unlocks E2E headings/progress/completion.
6) Filtering + file upload selectors — finish E2E interactions.
7) Re-run all tests; iterate where needed.

---

### Commands
- Unit (lab utilities):
  - `cd apps/web && pnpm test:unit --run src/lib/categorizer-lab`
- API route:
  - `cd apps/web && pnpm test:unit --run src/app/api/dev/categorizer-lab/run/route.spec.ts`
- E2E (Playwright):
  - `cd apps/web && pnpm test` (or `npx playwright test tests/e2e/categorizer-lab.spec.ts`)

---

### Acceptance criteria
- Unit: 100% passing for `mappers.spec.ts`, `parsers.spec.ts`, `metrics.spec.ts`, `synthetic.spec.ts`.
- API: All tests in `run/route.spec.ts` pass; status classification matches spec.
- E2E: All scenarios in `tests/e2e/categorizer-lab.spec.ts` pass across browsers.
- No production routes or navigation changed; lab remains fully removable.

---

### Risks and mitigations
- Risk: Over-aggressive vendor cleaning harms recall.
  - Mitigation: Keep cleaning scoped to known suffixes/boilerplate used in tests; add unit tests per pattern.
- Risk: Changing metrics computation could affect dashboards if reused.
  - Mitigation: Lab-only utilities; do not reuse in prod metrics.
- Risk: E2E flakiness due to debounced UI.
  - Mitigation: Use minimal debounce or explicit `Apply` buttons in test flows.

---

### Effort estimate
- Metrics + Parsers: 0.5–0.75 day
- Mappers (vendor + amount): 0.5 day
- API route policy changes: 0.25 day
- Page gating + headings + flow: 0.5 day
- Filtering + file upload adjustments: 0.25–0.5 day
- Test iterations: 0.5 day
- Total: ~2.5–3.5 days

---

### Rollback
- All edits are confined to lab modules and dev routes. To rollback, revert the specific files or the PR; production remains unaffected.


