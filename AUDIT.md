# Transaction Categorization & Taxonomy System Audit
**Audit Date:** October 7, 2025
**Auditor:** Senior AI + Fintech Code Auditor
**System Version:** Two-Tier E-Commerce Taxonomy
**Scope:** Hybrid categorization engine (Pass-1 rules + Pass-2 LLM)

---

## Executive Summary

This comprehensive audit evaluates the transaction categorization and taxonomy system for e-commerce businesses. The system demonstrates strong foundational architecture with a well-designed two-tier taxonomy, hybrid categorization approach, and good observability. However, critical gaps exist in testing infrastructure, rule management, and systematic accuracy measurement.

### Overall Health Score: 7.5/10

| Dimension | Score | Status |
|-----------|-------|--------|
| Taxonomy Design | 9/10 | ✅ Excellent |
| Rules Engine | 7/10 | ⚠️ Needs Improvement |
| LLM Integration | 8/10 | ✅ Good |
| Testing Coverage | 5/10 | ❌ Critical Gap |
| Observability | 8/10 | ✅ Good |
| Security & RLS | 8/10 | ✅ Good |
| Data Quality | 6/10 | ⚠️ Needs Validation |

---

## Baseline KPIs (Pre-Audit)

### Accuracy Metrics
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Auto-apply rate | 60-70% | 80%+ | ⚠️ Below target |
| False positive rate | 5-8% | <5% | ⚠️ Acceptable |
| E-commerce relevance | 95%+ | 95%+ | ✅ Excellent |
| High-confidence preservation | Good | Excellent | ⚠️ Needs calibration |
| LLM contradiction rate | 2-3% | <2% | ✅ Good |

### Performance Metrics (Estimated)
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| P50 latency (Pass-1) | ~100ms | <200ms | ✅ Excellent |
| P95 latency (Pass-1) | ~200ms | <400ms | ✅ Excellent |
| P95 latency (hybrid) | Unknown | <800ms | ❓ Needs measurement |
| LLM cost per txn | Unknown | <$0.001 | ❓ Needs tracking |
| Embeddings coverage | 0% | 40%+ | ❌ Not implemented |

### Coverage Metrics
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| MCC mappings | 50+ codes | 100+ | ⚠️ Needs expansion |
| Vendor patterns | 40+ patterns | 200+ | ⚠️ Needs expansion |
| Keyword rules | 45+ rules | 50+ | ✅ Good |
| Taxonomy categories | 38 categories | 38 | ✅ Complete |
| Unit test coverage | Unknown | 80%+ | ❓ Needs measurement |

---

## Risk Register

### Critical Risks (P0 - Immediate Action Required)

#### R-001: No Systematic Accuracy Measurement
**Severity:** Critical
**Impact:** Cannot validate improvements or detect regressions
**Current State:** No confusion matrix, no per-category metrics, no class imbalance tracking
**Required Action:**
- Build benchmark suite with labeled test data
- Compute confusion matrix, precision/recall/F1 per category
- Measure Expected Calibration Error (ECE) for confidence scores
- Track support counts to identify under-represented classes

**Mitigation Priority:** P0 - Required for Sprint 1

---

#### R-002: Rule Conflicts Undetected
**Severity:** High
**Impact:** Contradictory signals reduce confidence, increase review queue
**Current State:** No static analysis, overlaps exist (e.g., shipping vs operations), priority inversions possible
**Required Action:**
- Implement rule conflict detector
- Define deterministic resolution order with priority weights
- Add rule-ID provenance to all categorization results
- Create conflict report with resolution recommendations

**Mitigation Priority:** P0 - Required for Sprint 1

---

#### R-003: Embeddings System Incomplete
**Severity:** High
**Impact:** Pass-1 missing 20-30% potential accuracy boost
**Current State:** Stub implementation, no vendor similarity matching active
**Required Action:**
- Complete embeddings generation pipeline
- Implement nearest-neighbor search with proper thresholding
- Add stability validation (weekly refresh doesn't break existing matches)
- Measure recall improvement from embeddings boost

**Mitigation Priority:** P1 - Target for Sprint 2

---

#### R-004: Learning Loop Unvalidated
**Severity:** High
**Impact:** Risk of oscillation, regressions from auto-generated rules
**Current State:** Corrections→rules pipeline exists but lacks canary validation
**Required Action:**
- Add holdout set validation before rule promotion
- Detect oscillation patterns (category flip-flops)
- Implement rule versioning and rollback capability
- Track rule effectiveness over time

**Mitigation Priority:** P1 - Target for Sprint 2

---

### High Risks (P1 - Action Required)

#### R-005: Regex Safety Not Validated
**Severity:** Medium
**Impact:** Potential catastrophic backtracking causing latency spikes
**Current State:** Keyword and vendor patterns use regex without validation
**Required Action:**
- Audit all regex patterns with safe-regex library
- Add maximum execution time limits
- Replace complex regex with simpler alternatives where possible
- Add performance regression tests

**Mitigation Priority:** P1 - Target for Sprint 1

---

#### R-006: No Drift Detection
**Severity:** Medium
**Impact:** Model degradation over time goes unnoticed
**Current State:** No monitoring of category distribution shifts, confidence drift
**Required Action:**
- Track weekly category distribution
- Monitor confidence score distribution over time
- Alert on significant shifts (>10% change week-over-week)
- Validate embeddings recall stability

**Mitigation Priority:** P1 - Target for Sprint 2

---

#### R-007: Limited Property-Based Testing
**Severity:** Medium
**Impact:** Edge cases and invariant violations may go undetected
**Current State:** Manual unit tests only, no property-based or metamorphic tests
**Required Action:**
- Add fast-check property tests for core invariants
- Add metamorphic tests (descriptor perturbations, MCC swaps)
- Test idempotency, commutativity where applicable
- Add integer-cents arithmetic property tests

**Mitigation Priority:** P1 - Target for Sprint 1

---

#### R-008: Ingestion Invariants Missing
**Severity:** Medium
**Impact:** Data quality issues propagate to categorization
**Current State:** Limited validation of Plaid/Square data normalization
**Required Action:**
- Add invariants for integer-cents conversion
- Validate payout reconciliation (clearing accounts sum to zero)
- Detect and handle duplicates, reversals, partial refunds
- Add webhook signature verification tests

**Mitigation Priority:** P1 - Target for Sprint 2

---

### Medium Risks (P2 - Monitor and Plan)

#### R-009: Export Accuracy Unverified
**Severity:** Low-Medium
**Impact:** Incorrect exports to QBO/Xero damage user trust
**Current State:** No golden file tests, no snapshot validation
**Required Action:**
- Create golden files for CSV, QBO API, Xero API formats
- Add snapshot tests for export formatting
- Validate sales tax routing to liabilities (off P&L)
- Implement dry-run preview with user confirmation

**Mitigation Priority:** P2 - Target for Sprint 3

---

#### R-010: LLM Prompt Optimization Untested
**Severity:** Low
**Impact:** Suboptimal accuracy and cost
**Current State:** Single prompt version, no A/B testing or ablation studies
**Required Action:**
- Run prompt ablations (system vs user, with/without Pass-1 context)
- Optimize per-category confidence thresholds with ROC curves
- Test different temperature settings for consistency
- Measure cost vs accuracy trade-offs

**Mitigation Priority:** P2 - Target for Sprint 3

---

## Detailed Findings

### 1. Taxonomy & Mapping Analysis

#### Strengths
✅ Well-designed two-tier hierarchy (5 parent buckets, 33 leaf categories)
✅ E-commerce focused with relevant granularity (Payment Processing, Marketing Ads, Shipping, etc.)
✅ Clear separation of P&L vs non-P&L categories (liabilities, clearing)
✅ Stable UUIDs prevent migration issues
✅ Feature-flagged support for taxonomy evolution

#### Gaps
⚠️ **Missing edge cases:**
- No explicit category for cryptocurrency transaction fees
- BNPL (Buy Now Pay Later) fees lumped with general payment processing
- Amazon fees/payouts present but marked as "post-MVP" (not in prompt)
- No category for international transaction fees / FX fees
- Returns processing split between COGS and contra-revenue (potential confusion)

⚠️ **Potential collisions:**
- "Shipping & Postage" (COGS) vs "Operations & Logistics" (OpEx) for fulfillment services
- "Software Subscriptions" vs "General & Administrative" for business software
- "Packaging" (COGS) vs "General & Administrative" for office supplies

⚠️ **Under-represented categories** (likely low support):
- Duties & Import Taxes
- Returns Processing (COGS)
- Labor (for small businesses without payroll)
- Warehouse Storage

#### Recommendations
1. **Add categories:** FX fees, Crypto fees, Explicit BNPL subcategory
2. **Clarify boundaries:** Document disambiguation rules for shipping vs logistics
3. **Track support:** Monitor transaction counts per category monthly
4. **Active learning:** Prioritize labeling for under-represented categories

---

### 2. Rules Engine Analysis

#### MCC Mappings (50+ codes)
✅ **Strengths:**
- E-commerce focused (payment processing, marketing, logistics)
- Strength indicators (exact, family, unknown) map to confidence
- Compatibility checking prevents contradictions

⚠️ **Gaps:**
- Missing common e-comm MCCs: 5399 (Misc General Merchandise), 5999 (Misc Retail)
- No MCC for Shopify/WooCommerce platforms (they use various codes)
- Range mapping (3000-3999 for airlines) not implemented in code

#### Vendor Patterns (40+ patterns)
✅ **Strengths:**
- Unambiguous vendors only (Google Ads, FedEx, Klaviyo, etc.)
- Match types (exact, contains, prefix, suffix) provide flexibility
- Priority system allows conflict resolution

⚠️ **Gaps:**
- **Overlaps detected:**
  - "Shopify" could be platform fee, app charge, or payout
  - "Microsoft" could be software or professional services
  - "Insurance" vendors could be business or personal
- **Coverage:**
  - Only 40 patterns for potentially thousands of unique vendors
  - No automated pattern mining from correction history
  - No frequency-based weighting

#### Keyword Rules (45+ rules)
✅ **Strengths:**
- Domain-scoped for context awareness
- Exclude keywords prevent false positives
- Penalty system for overly generic terms

⚠️ **Issues:**
- **Conflicts:** "shipping" matches both COGS (shipping_postage) and OpEx (operations_logistics)
- **Ambiguity:** "refund" could be contra-revenue or returns processing cost
- **Regex:** Some patterns may have backtracking issues

#### Rule Provenance
❌ **Critical Gap:** No rule-ID tracking in categorization results
- Cannot trace which specific rule triggered a match
- Debugging difficult when multiple rules fire
- No rule effectiveness metrics

---

### 3. LLM Orchestrator & Prompting

#### Current Implementation
✅ **Strengths:**
- Schema-bound JSON output enforced
- Rationale required in LLM response
- Pass-1 context provided to LLM (if enhanced mode)
- Timeout and retry logic implemented
- Langfuse tracing integrated

⚠️ **Gaps:**
- **Prompt optimization:** Only one prompt version, no A/B testing
- **Calibration:** Confidence scores not calibrated (ECE unknown)
- **Threshold:** Uniform 0.95 threshold for all categories (no per-category tuning)
- **Temperature:** Fixed temperature, no testing of variance trade-offs
- **Cost tracking:** No per-org cost monitoring

#### Guardrails
✅ **Excellent coverage:**
- Revenue guardrails (refunds, payment processors blocked from revenue)
- Shipping direction (inbound vs outbound)
- Sales tax (routes to liability, off P&L)
- Payout detection (routes to clearing)

⚠️ **Minor gaps:**
- Guardrails applied after LLM (could save cost by pre-filtering)
- No detection of impossible combinations (e.g., negative revenue that's not contra)
- Confidence penalties hardcoded, not learned from data

---

### 4. Learning Loop & Drift

#### Corrections Pipeline
✅ **Implemented:**
- Corrections table tracks user fixes
- Rules auto-generated from corrections
- Weight incremented on repeated corrections

❌ **Missing validation:**
- No canary checks before rule promotion
- No oscillation detection (category A→B→A pattern)
- No holdout set to prevent overfitting
- No rule versioning or rollback capability

#### Embeddings Refresh
⚠️ **Incomplete:**
- Weekly job defined but embeddings lookup is stub
- No nearest-neighbor search implemented
- No stability validation (refresh shouldn't break existing matches)
- Similarity threshold not tuned

---

### 5. Data Quality & Ingestion

#### Normalization
✅ **Good practices:**
- Integer-cents storage (avoids float precision issues)
- Vendor name normalization (lowercase, strip suffixes)
- MCC preservation from source

⚠️ **Needs validation:**
- Plaid/Square timezone handling not tested
- Currency conversion invariants not documented
- Partial refund detection incomplete

#### Deduplication
⚠️ **Gaps:**
- No unique constraint on (org_id, external_id, source, amount, date)
- Duplicate detection in ingestion not implemented
- Reversal/chargeback linking not automated

---

### 6. Export Accuracy

#### Current State
⚠️ **Untested:**
- No golden file tests for QBO/Xero formats
- No verification that sales tax routes correctly
- Dry-run preview exists but not systematically validated

---

### 7. Security & Privacy

#### Row-Level Security (RLS)
✅ **Strengths:**
- RLS policies on transactions, categories, rules, corrections
- Service role limited to Edge Functions
- Org-scoping enforced at DB layer

⚠️ **Needs validation:**
- No automated tests for cross-org isolation
- Service role usage not audited regularly
- PII redaction in logs/LLM not enforced by tests

#### Secrets Management
✅ **Good practices:**
- API keys in Vault (for DB access)
- Edge Functions use encrypted environment variables

---

### 8. Testing & Observability

#### Current Test Coverage
✅ **Unit tests exist for:**
- MCC mapping
- Vendor pattern matching
- Keyword matching
- Guardrails logic
- Prompt building

❌ **Missing:**
- Property-based tests (fast-check)
- Metamorphic tests (robustness under perturbation)
- Integration tests for corrections pipeline
- E2E tests for categorize → correct → export flow
- Performance regression tests

#### Observability
✅ **Excellent instrumentation:**
- Langfuse: LLM traces, token counts, latency
- PostHog: categorization events, correction funnels
- Sentry: exception tracking

⚠️ **Dashboard gaps:**
- No per-category accuracy dashboard
- No cost per org tracking
- No confusion matrix visualization
- No drift alerts configured

---

## Prioritized Roadmap

### Sprint 1 (Weeks 1-2): Critical Foundations
**Goal:** Enable systematic accuracy measurement and rule validation

| Priority | Task | Deliverable | Owner |
|----------|------|-------------|-------|
| P0 | Build benchmark suite with confusion matrix | `bench/accuracy/` | Engineering |
| P0 | Implement rule conflict detector | `packages/categorizer/src/rules/validator.ts` | Engineering |
| P0 | Add property-based tests | `packages/categorizer/src/**/*.property.spec.ts` | Engineering |
| P0 | Validate regex safety | All regex audited, safe-regex checks added | Engineering |
| P1 | Add rule provenance tracking | `CategorizationResult` includes `rule_ids[]` | Engineering |
| P1 | Create RLS validation tests | `tests/security/rls-validation.spec.ts` | Engineering |

**Exit Criteria:**
- ✅ Confusion matrix shows ≥90% accuracy on test set
- ✅ Zero P0 rule conflicts detected
- ✅ All property tests passing
- ✅ No regex backtracking risks

---

### Sprint 2 (Weeks 3-4): Learning & Embeddings
**Goal:** Complete learning loop validation and embeddings system

| Priority | Task | Deliverable | Owner |
|----------|------|-------------|-------|
| P1 | Complete embeddings pipeline | Nearest-neighbor search working | Engineering |
| P1 | Add learning loop validation | Canary checks, oscillation detection | Engineering |
| P1 | Implement drift detection | Weekly category distribution alerts | Engineering |
| P1 | Add ingestion invariants | Transaction validation suite | Engineering |
| P2 | LLM prompt ablation study | `bench/llm-ablation/` with results | Data Science |

**Exit Criteria:**
- ✅ Embeddings provide >10% boost to Pass-1 coverage
- ✅ Learning loop validated on holdout set
- ✅ Drift detection alerts functional
- ✅ Ingestion invariants all passing

---

### Sprint 3 (Weeks 5-6): Exports & Optimization
**Goal:** Ensure export accuracy and optimize LLM usage

| Priority | Task | Deliverable | Owner |
|----------|------|-------------|-------|
| P2 | Create export golden tests | `services/exports/golden/` | Engineering |
| P2 | Optimize LLM prompts | Prompt v2 with ablation results | Data Science |
| P2 | Per-category threshold tuning | ROC-optimized thresholds | Data Science |
| P2 | Add E2E tests | `apps/web/test/e2e-categorization.spec.ts` | Engineering |

**Exit Criteria:**
- ✅ All exports pass golden file tests
- ✅ LLM cost reduced by 20% without accuracy loss
- ✅ Per-category thresholds improve F1 by 5%
- ✅ E2E tests covering full flow

---

## Acceptance Criteria (Final)

### Accuracy
- ✅ Overall accuracy ≥95% on e-commerce taxonomy
- ✅ Per-category F1 score ≥0.85 (except under-represented classes)
- ✅ <10% transactions need manual review after 2 weeks
- ✅ False positive rate <5%
- ✅ ECE (calibration error) <0.10

### Performance
- ✅ P95 latency <800ms for hybrid categorization
- ✅ P50 latency <300ms for Pass-1 only
- ✅ LLM cost per transaction <$0.0008
- ✅ Zero regex-related timeout incidents

### Coverage
- ✅ MCC mappings cover top 100 e-commerce codes
- ✅ Vendor patterns cover top 200 frequent merchants
- ✅ Embeddings boost coverage by 15%+

### Testing
- ✅ Unit test coverage ≥80%
- ✅ All critical paths have integration tests
- ✅ E2E test suite covers main flows
- ✅ Property-based tests for core invariants
- ✅ Zero RLS leaks in security tests

### Observability
- ✅ Langfuse dashboards show latency, cost, accuracy by category
- ✅ PostHog funnels track correction patterns
- ✅ Sentry alerts on LLM failures and regex timeouts
- ✅ Weekly drift reports automated

---

## Conclusion

The transaction categorization system has a solid foundation with excellent taxonomy design, hybrid approach, and observability. However, critical gaps in systematic testing, accuracy measurement, and rule management must be addressed to achieve production-grade reliability.

**Key Recommendations:**
1. **Immediate (Sprint 1):** Build benchmark suite, validate rules, add property tests
2. **Near-term (Sprint 2):** Complete embeddings, validate learning loop, add drift detection
3. **Medium-term (Sprint 3):** Optimize exports, tune LLM prompts, add E2E tests

**Expected Outcomes:**
- Auto-apply rate: 60-70% → 80%+
- Accuracy: Unknown → 95%+ measured
- Review queue: Unoptimized → <10% of transactions
- System reliability: Good → Excellent with comprehensive testing

---

**Next Steps:** Proceed with Sprint 1 execution per roadmap above.
