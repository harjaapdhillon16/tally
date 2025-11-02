# Shopify Integration

Real-time revenue ingestion from Shopify orders and refunds via webhooks and GraphQL Bulk Operations.

## Architecture

- **OAuth**: Next.js API routes handle Shopify OAuth flow and token exchange
- **Webhooks**: Edge Function receives and processes `orders/paid` and `refunds/create` events
- **Backfill**: Edge Function uses GraphQL Bulk Operations to fetch historical data (up to 180 days)
- **Transform**: Shared module normalizes Shopify data to our transaction schema with ecommerce categories

## Setup

### 1. Create Shopify App

1. Go to [Shopify Partners](https://partners.shopify.com/) and create a new app
2. Configure OAuth:
   - **App URL**: `https://your-domain.com`
   - **Allowed redirection URL(s)**: `https://your-domain.com/api/shopify/oauth/callback`
3. Set API scopes: `read_orders,read_all_orders`
4. Note your **API key** and **API secret**

### 2. Environment Variables

Add to `.env` (Next.js) and Supabase Edge Function secrets:

```bash
# Shopify API credentials
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_HOST=https://your-domain.com

# Encryption key (must be at least 32 characters)
ENCRYPTION_KEY=your_secure_encryption_key_here
```

### 3. Deploy Edge Functions

```bash
# Deploy all Shopify Edge Functions
supabase functions deploy shopify-store-connection
supabase functions deploy shopify-webhook
supabase functions deploy shopify-backfill

# Set secrets
supabase secrets set SHOPIFY_API_KEY=your_key
supabase secrets set SHOPIFY_API_SECRET=your_secret
supabase secrets set ENCRYPTION_KEY=your_encryption_key
```

### 4. Configure Webhooks in Shopify

In your Shopify app settings, add webhooks:

1. **orders/paid**
   - URL: `https://your-supabase-project.supabase.co/functions/v1/shopify-webhook`
   - Format: JSON
   - API version: 2024-10

2. **refunds/create**
   - URL: `https://your-supabase-project.supabase.co/functions/v1/shopify-webhook`
   - Format: JSON
   - API version: 2024-10

### 5. Run Migration

```bash
cd packages/db
supabase migration up
```

This adds `shopify` as a valid transaction source.

## Usage

### Connect a Store

1. Navigate to Settings > Connections
2. Click "Connect Shopify Store"
3. Enter shop domain (e.g., `your-store.myshopify.com`)
4. Authorize the app in Shopify
5. Connection is created and webhooks start flowing

### Backfill Historical Data

```bash
# Via Edge Function
curl -X POST https://your-supabase-project.supabase.co/functions/v1/shopify-backfill \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"connectionId": "conn-uuid", "daysBack": 180}'
```

Or trigger from UI (to be implemented).

## Data Flow

### Real-time (Webhooks)

1. Shopify sends `orders/paid` or `refunds/create` webhook
2. Edge Function verifies HMAC signature
3. Payload transformed to normalized transactions:
   - Revenue (subtotal) → `DTC Sales`
   - Shipping → `Shipping Income`
   - Discounts → `Discounts (Contra-Revenue)` (negative)
   - Refunds → `Refunds & Allowances (Contra-Revenue)` (negative)
4. Transactions upserted with idempotent `provider_tx_id`
5. Categorization job triggered if needed

### Historical (Backfill)

1. Start GraphQL Bulk Operation for orders in date range
2. Poll until `COMPLETED`
3. Download NDJSON result file
4. Stream and transform orders/refunds
5. Batch upsert transactions
6. Trigger categorization

## Transaction Mapping

| Shopify Data | Transaction | Category | Amount |
|--------------|-------------|----------|--------|
| Order subtotal | Revenue | DTC Sales | Positive |
| Shipping charges | Shipping income | Shipping Income | Positive |
| Discounts | Contra-revenue | Discounts (Contra) | Negative |
| Refunds | Contra-revenue | Refunds & Allowances | Negative |
| Sales tax | Excluded | (Liability, not P&L) | N/A |

## Provider Transaction IDs

- **Order revenue**: `order:<order_id>:revenue`
- **Order shipping**: `order:<order_id>:shipping`
- **Order discounts**: `order:<order_id>:discounts`
- **Refund**: `refund:<refund_id>`

These ensure idempotency when webhooks retry or backfill overlaps with real-time data.

## Testing

```bash
# Run transform unit tests
cd apps/edge/_shared
deno test shopify-transform.spec.ts

# Test webhook locally (requires ngrok or similar)
curl -X POST http://localhost:54321/functions/v1/shopify-webhook \
  -H "X-Shopify-Hmac-Sha256: <computed_hmac>" \
  -H "X-Shopify-Topic: orders/paid" \
  -H "X-Shopify-Shop-Domain: test-store.myshopify.com" \
  -d @test-order-payload.json
```

## Monitoring

- **Webhook failures**: Check Edge Function logs for HMAC verification errors
- **Ingestion rate**: Monitor `upserted` count in logs
- **Category distribution**: Verify transactions map to correct ecommerce categories
- **Duplicate handling**: Confirm `provider_tx_id` uniqueness prevents duplicates

## Troubleshooting

### Webhook not receiving events

- Verify webhook URL is publicly accessible
- Check HMAC secret matches `SHOPIFY_API_SECRET`
- Confirm webhook subscriptions are active in Shopify admin

### OAuth redirect fails

- Ensure `SHOPIFY_APP_HOST` matches your domain
- Verify redirect URI is whitelisted in Shopify app settings
- Check state parameter is not expired (10 min TTL)

### Backfill timeout

- Reduce `daysBack` parameter (default 180)
- Check Shopify API rate limits
- Verify GraphQL query syntax is valid for current API version

## Future Enhancements

- **Payments/Payouts**: Add `order_transactions/create` and `shopify_payments/payouts/*` webhook handlers
- **Inventory**: Track COGS from inventory adjustments
- **Multi-currency**: Handle currency conversion for reporting
- **Marketplace**: Extend to Amazon, eBay, Etsy with similar patterns




