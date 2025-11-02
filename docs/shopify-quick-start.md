# Shopify Integration Quick Start

Get the Shopify integration running locally in 15 minutes.

## Prerequisites

- Node.js 18+ and pnpm installed
- Supabase CLI installed (`npm install -g supabase`)
- Shopify Partners account (free)
- Shopify development store (free)

## Step 1: Create Shopify App (5 min)

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Click "Apps" > "Create app" > "Custom app"
3. Fill in:
   - **App name**: Nexus Dev
   - **App URL**: `http://localhost:3000`
   - **Redirect URL**: `http://localhost:3000/api/shopify/oauth/callback`
4. Under "Configuration" > "API access":
   - Select scopes: `read_orders`, `read_all_orders`
   - API version: 2024-10
5. Save and copy:
   - API key
   - API secret

## Step 2: Set Environment Variables (2 min)

Create `apps/web/.env.local`:

```bash
# Shopify
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_HOST=http://localhost:3000

# Supabase (from your existing .env)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key

# Encryption (generate a random 32+ char string)
ENCRYPTION_KEY=your_secure_random_key_min_32_chars
```

Set Supabase secrets:

```bash
cd /path/to/Nexus
supabase secrets set SHOPIFY_API_KEY=your_api_key_here
supabase secrets set SHOPIFY_API_SECRET=your_api_secret_here
supabase secrets set ENCRYPTION_KEY=your_secure_random_key_min_32_chars
```

## Step 3: Run Database Migration (1 min)

```bash
cd packages/db
supabase db reset  # Or apply migration 048 specifically
```

## Step 4: Start Services (2 min)

```bash
# Terminal 1: Start Supabase
supabase start

# Terminal 2: Start Next.js
cd apps/web
pnpm dev

# Terminal 3: Start Edge Functions
supabase functions serve
```

## Step 5: Connect Test Store (5 min)

1. Open http://localhost:3000 and log in
2. Navigate to Settings > Connections
3. Click "Connect Shopify Store"
4. Enter your dev store domain (e.g., `dev-store-123.myshopify.com`)
5. Click "Connect Store"
6. Authorize the app in Shopify
7. You'll be redirected back with a success message

## Step 6: Test Webhook (Optional)

### Option A: Use ngrok for real webhooks

```bash
# Terminal 4: Expose local Edge Functions
ngrok http 54321

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# In Shopify app settings, add webhooks:
# - orders/paid: https://abc123.ngrok.io/functions/v1/shopify-webhook
# - refunds/create: https://abc123.ngrok.io/functions/v1/shopify-webhook

# Create a test order in Shopify admin
# Mark it as paid
# Check Terminal 3 for webhook logs
```

### Option B: Manual test with curl

```bash
# Compute HMAC (use a script or online tool)
# Example payload
cat > test-order.json <<EOF
{
  "id": 12345,
  "name": "#1001",
  "processed_at": "2025-01-15T10:30:00Z",
  "financial_status": "paid",
  "currency": "USD",
  "current_subtotal_price": "100.00",
  "total_shipping_price": "10.00",
  "total_discounts": "5.00"
}
EOF

# Compute HMAC (Python example)
python3 -c "
import hmac, hashlib, base64, sys
secret = sys.argv[1]
body = open('test-order.json').read()
signature = base64.b64encode(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest()).decode()
print(signature)
" "YOUR_SHOPIFY_API_SECRET"

# Send webhook
curl -X POST http://localhost:54321/functions/v1/shopify-webhook \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: COMPUTED_HMAC" \
  -H "X-Shopify-Topic: orders/paid" \
  -H "X-Shopify-Shop-Domain: dev-store-123.myshopify.com" \
  -d @test-order.json
```

## Step 7: Verify Transactions

1. Go to http://localhost:3000/transactions
2. Look for Shopify transactions
3. Verify categories:
   - Revenue → "DTC Sales"
   - Shipping → "Shipping Income"
   - Discounts → "Discounts (Contra-Revenue)"

## Common Issues

### "Missing Shopify configuration"
- Check `.env.local` has `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`
- Restart Next.js dev server after adding env vars

### "Unauthorized" on webhook
- Verify HMAC is computed correctly
- Check `SHOPIFY_API_SECRET` matches in Supabase secrets
- Ensure raw body is used (not parsed JSON)

### "Connection not found" on webhook
- Verify shop domain matches exactly
- Check connection exists in database: `SELECT * FROM connections WHERE provider='shopify'`
- Ensure connection status is 'active'

### OAuth redirect fails
- Check `SHOPIFY_APP_HOST` is `http://localhost:3000` (no trailing slash)
- Verify redirect URI in Shopify app settings
- Clear browser cookies and try again

## Next Steps

- **Test backfill**: Trigger historical data import
  ```bash
  curl -X POST http://localhost:54321/functions/v1/shopify-backfill \
    -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"connectionId":"YOUR_CONNECTION_ID","daysBack":30}'
  ```

- **Run tests**:
  ```bash
  # Unit tests
  cd apps/edge/_shared
  deno test shopify-transform.spec.ts
  
  # E2E tests
  cd apps/web
  npx playwright test tests/e2e/shopify-integration.spec.ts
  ```

- **Deploy to staging**: See `docs/shopify-deployment-guide.md`

## Resources

- **Architecture**: `apps/edge/shopify/README.md`
- **Deployment**: `docs/shopify-deployment-guide.md`
- **Implementation**: `docs/shopify-implementation-summary.md`
- **Shopify API Docs**: https://shopify.dev/docs/api
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

## Support

If you encounter issues:

1. Check Edge Function logs: `supabase functions logs shopify-webhook`
2. Check Next.js console for errors
3. Review database: `SELECT * FROM connections; SELECT * FROM transactions WHERE source='shopify';`
4. See troubleshooting section in deployment guide




