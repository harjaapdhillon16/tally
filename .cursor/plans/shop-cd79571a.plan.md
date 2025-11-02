<!-- cd79571a-3764-40df-9f36-c06d16314a9a ab9b4047-174f-46b6-a5e6-938a21eec660 -->
# Shopify Orders/Refunds Integration Plan (Edge)

## Scope and decisions

- Real-time ingestion: orders and refunds only; payments/payouts deferred for later.
- Runtime: Edge Functions for webhooks/backfill; Next.js API only for OAuth.
- Deterministic mapping: set ecommerce revenue categories on ingestion; exclude sales tax from P&L.

## 1) DB schema updates

- Update `transactions.source` check to include `shopify`.
  - File: `packages/db/migrations/0xx_add_shopify_source.sql`
  - Alter check constraint from `('plaid','square','manual')` to include `'shopify'`.
- Ensure `connections` schema has no provider constraint; if it does, add `'shopify'`.

## 2) OAuth install (offline access)

- Add routes:
  - `apps/web/src/app/api/shopify/oauth/start/route.ts`: redirect to Shopify OAuth with scopes `read_orders,read_all_orders` (for >60d history) and `grant_options[]=offline`.
  - `apps/web/src/app/api/shopify/oauth/callback/route.ts`: exchange `code` for token; upsert `connections` row `{ provider:'shopify', org_id, shop_domain, scopes, status:'active' }`; store token in `connection_secrets` via existing AES-GCM helper.
- Env (from .env): `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_HOST`.

## 3) Webhook (Edge Function)

- New Edge Function: `apps/edge/shopify/webhook/index.ts`.
- Verify HMAC using `X-Shopify-Hmac-Sha256` against raw body with `SHOPIFY_API_SECRET`.
- Route by `X-Shopify-Topic`:
  - `orders/paid`: create revenue transactions.
  - `refunds/create`: create contra-revenue transactions.
- Use `upsertTransactions` to ensure idempotency with `provider_tx_id` keys.
- On successful inserts, optionally trigger `jobs-categorize-queue` only for transactions without deterministic mapping.

### Minimal HMAC verification (essential snippet)

```ts
const hmacHeader = req.headers.get('X-Shopify-Hmac-Sha256') || '';
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(Deno.env.get('SHOPIFY_API_SECRET')!), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
const valid = timingSafeEqual(expected, hmacHeader);
```

## 4) Transform and normalization

- New shared module: `apps/edge/_shared/shopify-transform.ts`:
  - `transformOrderToTransactions(order, orgId)` returns up to three rows:
    - Revenue: subtotal (exclude sales tax and shipping).
    - Shipping income: from `totalShippingPrice`.
    - Discounts: negative contra (`discounts_contra`).
  - `transformRefundToTransactions(refund, orgId)` returns negative contra revenue for refunded amounts.
- `provider_tx_id` examples:
  - `order:<order_id>:revenue`, `order:<order_id>:shipping`, `order:<order_id>:discounts`, `refund:<refund_id>`.
- Category assignment at ingestion (uses ecommerce taxonomy slugs):
  - Revenue → `dtc_sales`
  - Shipping → `shipping_income`
  - Discounts → `discounts_contra`
  - Refunds → `refunds_allowances_contra`

## 5) Historical backfill (GraphQL Bulk)

- New Edge Function: `apps/edge/shopify/backfill/index.ts`.
- Start bulk op with a query for orders in window (e.g., 180d) including: `id, name, processedAt, financialStatus, currentSubtotalPriceSet, totalShippingPriceSet, totalDiscountsSet, totalTaxSet, refunds { id, createdAt, totalRefundedSet }`.
- Poll `currentBulkOperation` until `COMPLETED`, stream the NDJSON result, transform, and `upsertTransactions` in batches.
- Rate limits: rely on bulk ops; add exponential backoff for polling.

## 6) Connection management

- Extend connections UI/flows to list `shop_domain` and provider `shopify` entries; reuse disconnect flow to revoke/uninstall if needed later.

## 7) Configuration, security, monitoring

- Secrets in `.env` and Supabase env: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_WEBHOOK_SECRET` (optional if using app secret), `SHOPIFY_APP_HOST`.
- Logging: mirror Plaid webhook logs; capture `topic`, `shop_domain`, `request_id`.
- Security monitoring: treat HMAC failures like existing webhook verification failures.

## 8) Testing

- Unit: transform functions, HMAC verifier, idempotency via `provider_tx_id`.
- Integration: Edge webhook handler with sample payloads for `orders/paid` and `refunds/create`.
- E2E: OAuth install happy path → webhook received → transactions upserted and categorized as expected.

## 9) Rollout

- Ship DB migration first; deploy OAuth + webhook endpoints; configure Shopify app webhook subscriptions to Edge URL.
- Pilot on one store; monitor inserts, error rate, and category distribution.
- Document support runbooks and backfill procedure.

### To-dos

- [ ] Create migration to add 'shopify' to transactions.source (and provider if constrained)
- [ ] Implement Shopify OAuth start/callback and store token in connection_secrets
- [ ] Create Edge Function to handle Shopify webhooks with HMAC verification
- [ ] Implement order/refund transformers to normalized transactions with provider_tx_id
- [ ] Implement GraphQL Bulk backfill Edge Function for historical orders/refunds
- [ ] Expose Shopify connection in UI and reuse disconnect flow
- [ ] Add logs/alerts for webhook verification and ingestion results
- [ ] Add unit/integration/E2E tests for OAuth, webhook, transforms, backfill
- [ ] Deploy, subscribe webhooks in Shopify admin, pilot with one store