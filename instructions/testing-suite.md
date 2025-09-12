## Categorization Testing Suite (Frontend) — Implementation Plan

Purpose: Build an isolated, removable frontend “lab” to test and visualize the categorization engine on synthetic or uploaded transaction batches. It must not impact production data paths or UI, and it should be easy to delete after evaluation.

---

### Goals and Scope
- Evaluate categorization behavior on different datasets without touching production state.
- Visualize raw transactions, predictions, confidence, and rationales.
- Measure accuracy and other metrics when ground truth is provided.
- Compare Pass‑1 vs Pass‑2, with timing and cost surfacing (if Pass‑2 enabled).
- Export results as JSON/CSV; no writes to `transactions` or other prod tables.

Out of scope: Any auto-apply decisioning, DB writes, or UI integration into production navigation beyond an isolated dev-only route.

---

### Isolation Strategy (Critical)
- Route group: Place all UI under `apps/web/src/app/(dev)/categorizer-lab/` and do not add to main navigation.
- Feature flag: Gate rendering on a single flag `CATEGORIZER_LAB_ENABLED`. Centralize the flag name in one enum/const (e.g., `apps/web/src/lib/flags.ts`). Do not scatter checks.
- Environment gating:
  - Only render when `NODE_ENV !== 'production'` OR when `CATEGORIZER_LAB_ENABLED === true`.
  - API handlers live under `apps/web/src/app/api/dev/categorizer-lab/*` and return 404 if either condition fails.
- No production writes: Do not import or call decisioning (`services/categorizer/apply.ts`). Avoid touching Supabase mutations. Read-only access is allowed only for synthetic demos where necessary—but default to client-provided data.
- Explicit “Removable” design: All code isolated to a `categorizer-lab` folder and a single flag file so deletion is trivial.

---

### High-Level Architecture
- UI (Client):
  - Upload JSON/CSV datasets or paste JSON.
  - Configure run parameters (engine: Pass‑1 only / Pass‑2 only / Hybrid; batch size; concurrency; stop on error; timeouts; seed for synthetic data).
  - Kick off a run and stream progress with per-transaction status.
  - Visualize predictions vs ground truth (if present).
  - Show metrics and charts.

- Runner (Server API):
  - POST `/api/dev/categorizer-lab/run` to process a batch.
  - Runs specified engine path using functions from `packages/categorizer`.
  - Enforces dev/flag gate and never writes to DB.
  - Produces structured results with timings and optional cost estimates (Pass‑2 only).

- Metrics (Client):
  - Pure functions for accuracy, precision/recall/F1, confusion matrix, calibration (confidence vs correctness), latency percentiles.
  - Optional cost summary for LLM runs (estimated based on per-call cost guidance; never log or require API keys in client).

- Data Sources:
  - Uploaded CSV/JSON.
  - Synthetic generators (e.g., parametric vendors, MCCs, amounts, noise ratios).
  - Optional: Pre-bundled tiny datasets from `scripts/verify-gemini-integration.ts` scenarios (converted to static JSON for demo), not fetched from DB.

---

### Folder Structure
- `apps/web/src/app/(dev)/categorizer-lab/page.tsx` — Main page with UI layout.
- `apps/web/src/components/categorizer-lab/` — Lab-only components:
  - `dataset-loader.tsx` — Upload/paste/generate controls and validation.
  - `run-controls.tsx` — Engine, batch size, concurrency, and thresholds.
  - `progress-panel.tsx` — Live status, throughput, error list.
  - `results-table.tsx` — Raw vs predicted view with rationale.
  - `metrics-summary.tsx` — Cards (accuracy, precision/recall/F1, coverage, avg confidence, P50/P95/P99 latency, LLM usage rate, est. cost).
  - `charts.tsx` — Confusion matrix heatmap, confidence histogram, latency violin/box plot.
  - `export-buttons.tsx` — Download JSON/CSV.
- `apps/web/src/lib/categorizer-lab/` — Lab-only utilities:
  - `types.ts` — Minimal dataset types independent of prod types.
  - `parsers.ts` — CSV/JSON parsing and schema validation (Zod).
  - `metrics.ts` — Accuracy, precision/recall/F1, confusion matrix, calibration, latency stats.
  - `synthetic.ts` — Deterministic dataset generators w/ seeds.
  - `client.ts` — Client for calling `/api/dev/categorizer-lab/run`.
  - `mappers.ts` — Map lab transaction format → `NormalizedTransaction` shape expected by Pass‑1/Pass‑2.
- `apps/web/src/app/api/dev/categorizer-lab/run/route.ts` — Dev-only batch executor.
- `apps/web/src/lib/flags.ts` — Single enum/const for `CATEGORIZER_LAB_ENABLED`.

Note: Keep the lab’s types and utilities separate from production libs to avoid accidental coupling.

---

### Data Contract (Lab)
- Input transaction (lab format):
  - `{ id: string; merchantName?: string; description: string; mcc?: string; amountCents: string; date?: string; currency?: 'USD'; categoryId?: string; }`
  - `categoryId` is optional ground truth for accuracy calculation.
- Engine options:
  - `mode: 'pass1' | 'pass2' | 'hybrid'`
  - `batchSize: number`, `concurrency: number`, `timeoutMs?: number`
  - `useLLM: boolean` (alias for `'pass2'|'hybrid'`)
- Output per transaction:
  - `{ id, predictedCategoryId?: string, confidence?: number, rationale?: string[], engine: 'pass1'|'llm', timings: { totalMs: number, pass1Ms?: number, pass2Ms?: number }, error?: string }`
- Output aggregate:
  - `{ totals: { count, errors, pass1Only, llmUsed }, latency: { p50, p95, p99, mean }, accuracy?: { overall, perCategory[], confusionMatrix }, confidence: { mean, histogram[] }, cost?: { estimatedUsd: number, calls: number } }`

---

### Engine Execution Rules
- Pass‑1 only: Call `pass1Categorize` from `packages/categorizer`. No DB writes. If reading vendor caches is part of Pass‑1, stub or disable for lab by passing empty caches in context.
- Pass‑2 only: Call `scoreWithLLM` with a minimal server-side ctx that uses the `.env` key. Never expose keys to the client. If env key missing, return a clear error; do not fallback to production code paths.
- Hybrid: Run Pass‑1 first; if confidence < threshold (e.g., 0.85), run Pass‑2; otherwise keep Pass‑1.
- All amounts remain strings (cents). Do not parse floats in prompts.
- Clamp confidence within [0,1].

---

### Metrics Definitions
- Accuracy (needs ground truth): `(correct / totalWithGroundTruth)`.
- Precision/Recall/F1 per category.
- Confusion matrix: `[truth x predicted]` counts.
- Coverage: fraction of transactions receiving a non-null category.
- Calibration: plot binned confidence vs actual correctness.
- Latency: per-tx total and per-engine timings; p50/p95/p99/mean.
- LLM usage rate: fraction of transactions where Pass‑2 executed.
- Estimated LLM cost: `calls * unitCost`; keep the estimator server-side and configurable; never assume or hardcode API pricing in client.

---

### UX/Visualization
- Dataset loader section: paste JSON, upload CSV, or generate synthetic data (size, vendor noise %, MCC mix, positive/negative examples ratio).
- Run controls: select engine mode, thresholds, concurrency, and a “dry run” vs “record metrics” toggle.
- Live progress: processed/total, throughput, ETA, error list with download of errors.
- Results table: raw fields, predicted category, confidence pill, rationale tooltip.
- Metrics summary cards and charts with toggles for per-category views.
- Export buttons: JSON and CSV for both predictions and aggregate metrics.

---

### Security & Privacy
- Route 404 in production unless `CATEGORIZER_LAB_ENABLED` is explicitly set.
- API checks: deny if neither `NODE_ENV !== 'production'` nor the feature flag is enabled.
- No secret exposure in client. All LLM calls strictly server-side.
- No production data reads by default; the lab operates on user-provided datasets.

---

### Implementation Steps
1) Flags and scaffolding
   - Add `apps/web/src/lib/flags.ts` with a single exported enum/const for `CATEGORIZER_LAB_ENABLED`.
   - Create `apps/web/src/app/(dev)/categorizer-lab/page.tsx` with a basic placeholder. Do not link from main nav.
   - Add 404 guard if disabled.

2) Lab utilities and types
   - Implement `types.ts`, `parsers.ts` (CSV→lab schema; JSON validation with Zod), `metrics.ts`, `synthetic.ts`, `mappers.ts` in `apps/web/src/lib/categorizer-lab/`.

3) Server API (dev-only)
   - Implement `POST /api/dev/categorizer-lab/run`:
     - Validate payload: dataset + engine options.
     - For each tx: map to `NormalizedTransaction`, run engines per mode, record timings, compile results.
     - Return stream or batched results (start with batched; stream can be a follow-up).
     - Guard with env + feature flag; never write to DB.

4) UI components
   - Build components under `components/categorizer-lab/` per the folder list above.
   - Add charts (e.g., Chart.js or lightweight alternative already used in repo). Keep dependencies minimal.

5) Metrics and visualizations
   - Implement metric calculators and verify with small unit tests.
   - Render summary cards and charts. Add toggles for per-category views and calibration plots.

6) Exports
   - Implement JSON/CSV export for predictions and aggregates.

7) Optional enhancements
   - Streaming updates (SSE) for long runs.
   - Web worker (client) for local-only Pass‑1 experiments (no LLM).
   - Scenario presets (import tiny JSONs derived from the existing verification scripts).

---

### Testing Plan (for the Lab)
- Unit tests (Vitest): `parsers.ts`, `metrics.ts`, `synthetic.ts`, `mappers.ts`.
- Integration: API run handler processes a small batch and returns expected structure and timing fields.
- E2E (Playwright): Load page (when enabled), upload a sample dataset, run Pass‑1, verify that metrics summary renders and export buttons work.

---

### Instrumentation (Optional)
- If desired, track a minimal event `categorizer_lab_run` with a dev-only PostHog guard. Store the event name in a central enum/const to avoid scattering. Do not include any PII. Respect feature-flag gating.

---

### Configuration & Keys
- Read LLM key from server environment only (e.g., `GEMINI_API_KEY`). Never expose to the client.
- If missing keys, the API should return a clear error indicating Pass‑2 is unavailable; Pass‑1 should still work.

---

### Removal Plan
- Delete `apps/web/src/app/(dev)/categorizer-lab/` and `apps/web/src/app/api/dev/categorizer-lab/`.
- Remove `CATEGORIZER_LAB_ENABLED` from `flags.ts` and any references.
- Remove optional dev-only event constants.
- Since nothing touches production DB or nav, removal should have no side effects.

---

### Acceptance Criteria
- Lab is disabled by default in production builds and returns 404.
- Can upload or generate a dataset and run Pass‑1 without errors.
- When keys exist and flag is enabled, Pass‑2 and Hybrid modes work.
- Metrics show overall accuracy, per-category PR/F1, confusion matrix, calibration, and latency percentiles.
- Exports produce valid JSON/CSV.

---

### Implementation Status

✅ **COMPLETED** - Full implementation with comprehensive testing suite

See `instructions/categorizer-lab-implementation.md` for complete implementation details, architecture, and troubleshooting guide.

**Final Results:**
- Unit Tests: 66/66 passed (100%) ✅
- API Tests: 12/12 passed (100%) ✅  
- E2E Tests: Major improvements in flow and element detection
- Full frontend testing suite with metrics, visualizations, and export functionality


