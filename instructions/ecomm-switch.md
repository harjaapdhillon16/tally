### E‑commerce Switch Implementation Plan (Shopify‑first, MVP)

This document specifies the exact code edits, migrations, guardrails, tests, and rollout steps to shift the product from salons to DTC e‑commerce (Shopify‑first). It centralizes prompts and taxonomy to avoid drift and prepares for later Amazon/WooCommerce additions without rewrite.

---

## 0) Decisions locked (scope + policy)

- **Scope**: DTC Shopify brands first. Amazon/eBay/Etsy/wholesale deferred. Seed placeholders but do not expose in the LLM prompt.
- **COGS vs Opex**: Enforce separation.
- **Payment processing fees**: Opex under umbrella `payment_processing_fees` with child categories for processors.
- **Shipping**: Separate `shipping_income` (revenue) vs `shipping_expense` (opex).
- **Discounts/Refunds**: Use contra‑revenue accounts `discounts_contra`, `refunds_allowances_contra`.
- **Sales tax**: Exclude from P&L; map payments to `sales_tax_payable` (liability).
- **Inventory**: MVP maps inventory purchases to COGS.
- **LLM**: Gemini 2.5 Flash‑Lite; auto‑apply threshold = 0.85.
- **Guardrails**: Refunds/returns cannot map to revenue; payment processor vendors cannot map to any revenue.
- **Shopify payouts via Plaid**: Map to `shopify_payouts_clearing` (clearing account, not P&L). Add UI note. Do not list in LLM prompt.

---

## 1) Centralize Prompt + Taxonomy (single source of truth)

Create two shared modules in categorizer package:

- `packages/categorizer/src/taxonomy.ts`
  - Export ecommerce taxonomy tree (slugs, display names, parent relationships, type hints for P&L vs liability vs clearing).
  - Export salon taxonomy for backward compatibility.
  - Export helpers:
    - `getActiveTaxonomy(industry: 'ecommerce' | 'salon'): CategoryNode[]`
    - `getCategoryBySlug(slug: string, industry: Industry): CategoryNode | undefined`
    - `isPnlCategory(slug: string): boolean`

- `packages/categorizer/src/prompt.ts`
  - Export `buildCategorizationPrompt(tx, priorCategoryName, industry)` using taxonomy to render the “Available categories” section.
  - For ecommerce, deliberately exclude non‑P&L categories like `sales_tax_payable` and `shopify_payouts_clearing` from the displayed list.

Then update all callsites to import from these utilities instead of inlining prompts.

Files to edit:
- `packages/categorizer/src/pass2_llm.ts` (replace local builder with centralized `prompt.ts`)
- `apps/edge/jobs/categorize-queue/index.ts` (remove inline prompt; import)
- `supabase/functions/jobs-categorize-queue/index.ts` (remove inline prompt; import)

---

## 2) Ecommerce Chart of Accounts (taxonomy + DB seed)

Add a new SQL migration to seed ecommerce categories alongside salon categories. Do NOT modify `001_init.sql`.

- File: `packages/db/migrations/016_ecommerce_taxonomy.sql` (next sequential number)
- Insert global categories (`org_id = NULL`) with stable IDs. Prefer deterministic UUID v5 derived from namespace + slug for stability across environments.

Proposed slugs and display names (initial MVP):

- Revenue
  - `dtc_sales` → “DTC Sales”
  - `shipping_income` → “Shipping Income”
  - `discounts_contra` → “Discounts (Contra‑Revenue)”
  - `refunds_allowances_contra` → “Refunds & Allowances (Contra‑Revenue)”

- Cost of Goods Sold
  - `inventory_purchases` → “Inventory Purchases”
  - `inbound_freight` → “Inbound Freight”
  - `packaging_supplies` → “Packaging Supplies”
  - `manufacturing_costs` → “Manufacturing Costs”

- Operating Expenses
  - `payment_processing_fees` → “Payment Processing Fees” (parent)
    - `stripe_fees` → “Stripe Fees”
    - `paypal_fees` → “PayPal Fees”
    - `shop_pay_fees` → “Shop Pay Fees”
    - `bnpl_fees` → “BNPL Fees”
  - `marketing` → “Marketing & Advertising” (parent)
    - `ads_meta` → “Meta Ads”
    - `ads_google` → “Google Ads”
    - `ads_tiktok` → “TikTok Ads”
    - `ads_other` → “Other Ads”
  - `shopify_platform` → “Shopify Platform”
  - `app_subscriptions` → “App Subscriptions”
  - `email_sms_tools` → “Email/SMS Tools”
  - `fulfillment_3pl_fees` → “Fulfillment & 3PL Fees”
  - `warehouse_storage` → “Warehouse Storage”
  - `shipping_expense` → “Shipping Expense”
  - `returns_processing` → “Returns Processing”
  - `software_general` → “Software (General)”
  - `professional_services` → “Professional Services”
  - `rent_utilities` → “Rent & Utilities”
  - `insurance` → “Insurance”
  - `payroll_contractors` → “Payroll/Contractors”
  - `office_supplies` → “Office Supplies”
  - `travel` → “Travel & Transportation”
  - `bank_fees` → “Bank Fees”
  - `other_ops` → “Other Operating Expenses”

- Taxes / Liabilities (not in P&L)
  - `sales_tax_payable` → “Sales Tax Payable” (liability)
  - `duties_import_taxes` → “Duties & Import Taxes” (can be COGS or Opex; treat as Opex initially)

- Clearing (not in P&L)
  - `shopify_payouts_clearing` → “Shopify Payouts Clearing” (balance sheet/clearing)

Also seed placeholders (hidden from prompt until post‑MVP):
- `amazon_fees` → “Amazon Fees”
- `amazon_payouts` → “Amazon Payouts”

Parent relations:
- Create high‑level parents: `Revenue`, `COGS`, `Operating Expenses`, `Taxes & Liabilities`, `Clearing` and set `parent_id` for children accordingly.

Post‑migration helper:
- Provide a script or query to fetch slug→id mapping after seed for use in app constants (`SELECT id, name FROM categories WHERE org_id IS NULL AND name IN (...)`).

---

## 3) LLM category mapping + validation

In `packages/categorizer/src/pass2_llm.ts`:
- Replace `CATEGORY_MAPPINGS` with ecommerce slugs → seeded UUIDs.
- Implement `mapCategorySlugToId(slug, industry)` using the taxonomy helper and slug→id map. If slug unknown, default to `other_ops` with reduced confidence (e.g., 0.65).
- Parse/validate LLM JSON; reject any non‑listed slug.
- Do not expose non‑P&L or clearing slugs in prompt; LLM should rarely return them.

Available categories listed in ecommerce prompt (MVP):

- Revenue: `dtc_sales`, `shipping_income`, `discounts_contra`, `refunds_allowances_contra`
- COGS: `inventory_purchases`, `inbound_freight`, `packaging_supplies`, `manufacturing_costs`
- Opex: `ads_meta`, `ads_google`, `ads_tiktok`, `ads_other`, `payment_processing_fees`, `stripe_fees`, `paypal_fees`, `shop_pay_fees`, `bnpl_fees`, `shopify_platform`, `app_subscriptions`, `email_sms_tools`, `fulfillment_3pl_fees`, `warehouse_storage`, `shipping_expense`, `returns_processing`, `software_general`, `professional_services`, `rent_utilities`, `insurance`, `payroll_contractors`, `office_supplies`, `travel`, `bank_fees`, `other_ops`

Excluded from prompt intentionally: `sales_tax_payable`, `shopify_payouts_clearing`, `amazon_*`.

---

## 4) Guardrails + Pass‑1 rules

Guardrails (applied pre/post LLM and in Pass‑1):
- If description contains refund/return keywords or negative amounts consistent with refunds, block mapping to any positive revenue; prefer `refunds_allowances_contra`.
- If merchant/vendor in {Stripe, PayPal, Shopify Payments, Afterpay, Affirm, Adyen}, block mapping to revenue.
- If sales tax keywords or tax authority merchants detected, prefer `sales_tax_payable` (liability) instead of any P&L.

Pass‑1 rules (seed into `rules` table via a new migration or seed script):
- Vendor/keyword patterns:
  - Shopify (platform): `shopify_platform`
  - Shopify Payments fees: `shop_pay_fees`
  - Stripe: `stripe_fees`
  - PayPal: `paypal_fees`
  - USPS/UPS/FedEx/ShipStation: `shipping_expense`
  - Klaviyo/Attentive/Postscript: `email_sms_tools`
  - Meta/FB/IG: `ads_meta`; Google Ads: `ads_google`; TikTok: `ads_tiktok`
  - 3PLs: `fulfillment_3pl_fees`; Warehouses: `warehouse_storage`
  - Packaging suppliers: `packaging_supplies`
  - Manufacturers/factories: `manufacturing_costs`
- MCC mapping expansions for shipping, postage, couriers, online ads, SaaS, payment services.
- Shopify payout deposits via Plaid: route to `shopify_payouts_clearing` (Pass‑1 only), never LLM.

Confidence calibration:
- Keep auto‑apply at 0.85. Lower unknown slug fallback confidence to 0.65 to route to review.

---

## 5) Industry gating at runtime

- Use `orgs.industry` to select taxonomy and prompt. Avoid new feature flags.
- Introduce `packages/categorizer/src/config.ts`:
  - `getIndustryForOrg(db, orgId): 'ecommerce' | 'salon'`
  - `shouldUseLLM(industry): boolean` (kept true if key present)
  - Reuse across Pass‑1 and Pass‑2 to prevent divergence.

Update:
- `services/categorizer/categorize.ts` to pass industry into Pass‑1 and Pass‑2 contexts.
- Edge job(s) and Supabase function(s) to fetch industry and use centralized prompt builder.

---

## 6) Recategorization workflow (industry switch + historical)

When an org switches industry to ecommerce:
- Enqueue background job to recategorize recent history (e.g., last 180 days) using hybrid engine.
- For each transaction, if category changes, set `needs_review = true` and log a decision record.

Deliverables:
- API or admin action to update `orgs.industry`.
- Job entry point (Edge or Supabase function) to batch transactions and run hybrid flow.
- UI banner and activity log entry indicating recategorization is running/complete.

---

## 7) UI copy + tooltips

- Replace salon copy with ecommerce across user‑visible strings.
- Add tooltip for sales tax: “Sales tax payments are treated as liability reductions, not operating expenses, so they don’t affect Net Profit.”
- Add notice on transactions mapped to `shopify_payouts_clearing`: “These are Shopify payouts. Detailed breakdown (fees, refunds) will be available once Shopify is connected.”

---

## 8) Testing plan

Unit tests:
- Prompt builder returns ecommerce prompt and includes only allowed slugs.
- Guardrails block refunds→revenue, processors→revenue.
- Mapping unknown slug → `other_ops` with 0.65 confidence.

Pass‑1 tests:
- Vendor keyword detection for Stripe/PayPal/Shopify Payments/USPS/UPS/FedEx/ShipStation/Klaviyo/Meta/Google/TikTok/3PL/warehouse.
- Shopify payout sample descriptions route to `shopify_payouts_clearing`.

E2E tests:
- Hybrid engine respects 0.85 threshold.
- Historical recategorization job marks changed items `needs_review = true` and writes decisions.

Categorizer Lab:
- Add ecommerce scenarios in `apps/web/src/lib/categorizer-lab/test-scenarios.ts` covering: Shopify payouts, processor fees, ads channels, shipping income/expense, refunds/discounts, inventory POs, 3PL, warehouse.

Docs updates:
- Update `docs/categorizer-lab-architecture.md`, `docs/categorizer-lab-implementation.md`, `docs/3-categorization.md` with ecommerce examples.

---

## 9) Rollout

- Behind industry gating by org; no global flag flip required.
- Migrations shipped first, then code referencing taxonomy/prompts.
- Select a pilot org; run lab scenarios and verify gross margin and channel spend lines.
- Monitor: Pass‑1 hit rate, auto‑apply rate at 0.85, LLM usage, confidence variance, top guardrail triggers.

---

## 10) Concrete edit checklist (by file)

Prompts & mapping:
- [ ] `packages/categorizer/src/prompt.ts` (new): ecommerce prompt from taxonomy
- [ ] `packages/categorizer/src/taxonomy.ts` (new): ecommerce taxonomy + helpers
- [ ] `packages/categorizer/src/pass2_llm.ts`: import prompt/taxonomy; replace `CATEGORY_MAPPINGS`; implement validation + fallback
- [ ] `apps/edge/jobs/categorize-queue/index.ts`: replace inline prompt with import
- [ ] `supabase/functions/jobs-categorize-queue/index.ts`: replace inline prompt with import

DB + rules:
- [ ] `packages/db/migrations/016_ecommerce_taxonomy.sql`: seed categories (UUID v5)
- [ ] `packages/db/migrations/017_pass1_rules_ecommerce.sql`: vendor/keyword/MCC rules
- [ ] Optional helper script: output slug→id map for app use

Engine & config:
- [ ] `services/categorizer/categorize.ts`: pass industry context
- [ ] `packages/categorizer/src/config.ts`: `getIndustryForOrg`, `shouldUseLLM`

Guardrails:
- [ ] `packages/categorizer/src/engine/pass1.ts`: refund/processor blocks; Shopify payout → clearing
- [ ] `services/categorizer/pass2.ts` or equivalent enhanced LLM guardrails (pre/post)

Jobs & UI:
- [ ] Recategorization job (Edge/Supabase): enqueue, batch, mark for review when changed
- [ ] UI copy updates; sales‑tax tooltip; payout notice

Tests & docs:
- [ ] Unit tests for prompt, mapping, guardrails
- [ ] E2E tests for hybrid flow + recategorization
- [ ] Lab scenarios added
- [ ] Docs updated (architecture, implementation, categorization)

---

## 11) Example: ecommerce LLM prompt (single source)

```ts
// packages/categorizer/src/prompt.ts
export function buildCategorizationPrompt(tx: NormalizedTransaction, priorCategoryName?: string): string {
  const trimmedDescription = tx.description.length > 160 ? tx.description.slice(0, 157) + '...' : tx.description;
  return `You are a financial categorization expert for e‑commerce businesses. Always respond with valid JSON only.

Categorize this business transaction for an e‑commerce store:

Transaction Details:
- Merchant: ${tx.merchantName || 'Unknown'}
- Description: ${trimmedDescription}
- Amount: $${(parseInt(tx.amountCents) / 100).toFixed(2)}
- MCC: ${tx.mcc || 'Not provided'}
- Industry: ecommerce
${priorCategoryName ? `- Prior category: ${priorCategoryName}` : ''}

Available categories:
Revenue: dtc_sales, shipping_income, discounts_contra, refunds_allowances_contra
COGS: inventory_purchases, inbound_freight, packaging_supplies, manufacturing_costs
Expenses: ads_meta, ads_google, ads_tiktok, ads_other, payment_processing_fees, stripe_fees, paypal_fees, shop_pay_fees, bnpl_fees, shopify_platform, app_subscriptions, email_sms_tools, fulfillment_3pl_fees, warehouse_storage, shipping_expense, returns_processing, software_general, professional_services, rent_utilities, insurance, payroll_contractors, office_supplies, travel, bank_fees, other_ops

Return JSON only:
{
  "category_slug": "most_appropriate_category",
  "confidence": 0.85,
  "rationale": "Brief explanation of why this category fits"
}

Rules:
- Refunds/returns must not map to revenue; choose refunds_allowances_contra.
- Payment processors (Stripe, PayPal, Shopify Payments, BNPL) must not map to revenue.
- If uncertain, choose a broader expense category with lower confidence.`;
}
```

---

## 12) Notes on P&L vs Balance Sheet in UI

- Exclude categories marked “liability” or “clearing” from P&L aggregation and charts.
- Continue storing category IDs on transactions as today; reporting layer filters by taxonomy metadata.

---

## 13) Post‑MVP extensibility

- Add marketplace categories to taxonomy; include them in the prompt only when that connector is enabled for the org.
- Switch to connector‑aware prompts: when Shopify connector is active, also allow LLM to recommend processor‑specific fees with higher confidence.

---

## 14) Acceptance criteria

- Centralized prompt used by all categorization paths; no duplicated inline prompts.
- Ecommerce taxonomy seeded and used at runtime based on `orgs.industry`.
- Guardrails enforced; no refunds/returns or processors mapped to revenue in tests.
- Shopify payouts via Plaid categorized to `shopify_payouts_clearing` in Pass‑1.
- Auto‑apply threshold remains 0.85 with confidence variance observed.
- Historical recategorization job works and marks changed transactions for review.


