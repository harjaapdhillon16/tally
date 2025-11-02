# Shopify Integration Deployment Guide

Complete guide to deploying the Shopify integration for real-time revenue ingestion.

## Prerequisites

- Shopify Partners account
- Supabase project with Edge Functions enabled
- Next.js app deployed and accessible
- Database migrations applied (048_add_shopify_source.sql)

## Step 1: Create Shopify App

### 1.1 Create App in Partners Dashboard

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Click "Apps" > "Create app"
3. Choose "Custom app" (for single merchant) or "Public app" (for multiple merchants)
4. Fill in app details:
   - **App name**: Nexus Revenue Tracker
   - **App URL**: `https://your-domain.com`
   - **Allowed redirection URL(s)**: `https://your-domain.com/api/shopify/oauth/callback`

### 1.2 Configure API Access

1. Go to "Configuration" > "App setup"
2. Under "API access", select:
   - **Admin API access scopes**:
     - `read_orders` (required)
     - `read_all_orders` (required for >60 day history)
   - **API version**: 2024-10 or later

3. Save and note your:
   - **API key** (Client ID)
   - **API secret** (Client secret)

### 1.3 Enable Offline Access

In OAuth settings, ensure "Request offline access token" is enabled. This allows background jobs to run without user interaction.

## Step 2: Configure Environment Variables

### 2.1 Next.js Environment (.env.local)

```bash
# Shopify API credentials
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_HOST=https://your-domain.com

# Supabase (if not already configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Encryption key (must be at least 32 characters)
ENCRYPTION_KEY=your_secure_encryption_key_here
```

### 2.2 Supabase Edge Function Secrets

```bash
# Set secrets for Edge Functions
supabase secrets set SHOPIFY_API_KEY=your_api_key_here
supabase secrets set SHOPIFY_API_SECRET=your_api_secret_here
supabase secrets set ENCRYPTION_KEY=your_secure_encryption_key_here

# Verify secrets are set
supabase secrets list
```

## Step 3: Deploy Edge Functions

### 3.1 Deploy Functions

```bash
# Navigate to project root
cd /path/to/Nexus

# Deploy all Shopify Edge Functions
supabase functions deploy shopify-store-connection --project-ref your-project-ref
supabase functions deploy shopify-webhook --project-ref your-project-ref
supabase functions deploy shopify-backfill --project-ref your-project-ref

# Verify deployments
supabase functions list
```

### 3.2 Test Edge Functions

```bash
# Test store-connection function
curl -X POST https://your-project.supabase.co/functions/v1/shopify-store-connection \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"orgId":"test","shop":"test.myshopify.com","accessToken":"test","scopes":["read_orders"]}'

# Should return 200 OK or error message
```

## Step 4: Configure Webhooks in Shopify

### 4.1 Add Webhook Subscriptions

1. Go to your Shopify app in Partners Dashboard
2. Navigate to "Configuration" > "Webhooks"
3. Click "Add webhook"

**Webhook 1: orders/paid**
- **Event**: Order payment
- **URL**: `https://your-project.supabase.co/functions/v1/shopify-webhook`
- **Format**: JSON
- **API version**: 2024-10

**Webhook 2: refunds/create**
- **Event**: Refund creation
- **URL**: `https://your-project.supabase.co/functions/v1/shopify-webhook`
- **Format**: JSON
- **API version**: 2024-10

### 4.2 Verify Webhook Configuration

Shopify will send a test webhook to verify the endpoint. Check Edge Function logs:

```bash
supabase functions logs shopify-webhook --project-ref your-project-ref
```

You should see verification requests with HMAC validation.

## Step 5: Run Database Migration

### 5.1 Apply Migration

```bash
cd packages/db

# Apply migration to add 'shopify' source
supabase db push --project-ref your-project-ref

# Or if using migration files directly
psql $DATABASE_URL -f migrations/048_add_shopify_source.sql
```

### 5.2 Verify Migration

```sql
-- Check that 'shopify' is now a valid source
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'transactions_source_check';

-- Should include 'shopify' in the check clause
```

## Step 6: Deploy Next.js App

### 6.1 Build and Deploy

```bash
cd apps/web

# Build the app
npm run build

# Deploy to your hosting platform (Vercel, etc.)
vercel deploy --prod

# Or deploy via your CI/CD pipeline
```

### 6.2 Verify OAuth Routes

Test OAuth flow:

1. Navigate to `https://your-domain.com/settings/connections`
2. Click "Connect Shopify Store"
3. Enter a test shop domain
4. Should redirect to Shopify OAuth page

## Step 7: Test Integration

### 7.1 Connect Test Store

1. Use a Shopify development store for testing
2. Go to Settings > Connections in your app
3. Click "Connect Shopify Store"
4. Enter your dev store domain (e.g., `dev-store.myshopify.com`)
5. Authorize the app
6. Verify connection appears in connections list

### 7.2 Test Webhook Ingestion

Create a test order in your Shopify dev store:

1. Go to Shopify admin > Orders
2. Create a draft order
3. Mark it as paid
4. Check Edge Function logs for webhook processing:

```bash
supabase functions logs shopify-webhook --project-ref your-project-ref
```

5. Verify transactions appear in your app:
   - Navigate to Transactions page
   - Look for Shopify transactions with correct categories

### 7.3 Test Backfill

Trigger historical backfill:

```bash
# Get connection ID from database or UI
CONNECTION_ID="your-connection-uuid"

# Trigger backfill for last 30 days
curl -X POST https://your-project.supabase.co/functions/v1/shopify-backfill \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"connectionId\":\"$CONNECTION_ID\",\"daysBack\":30}"
```

Monitor logs and verify transactions are created.

## Step 8: Production Rollout

### 8.1 Pre-Launch Checklist

- [ ] All environment variables set in production
- [ ] Edge Functions deployed and tested
- [ ] Database migration applied
- [ ] Webhooks configured and verified
- [ ] OAuth flow tested end-to-end
- [ ] Test store connected and ingesting data
- [ ] Monitoring and alerts configured

### 8.2 Launch to First Customer

1. Have customer install app via OAuth
2. Monitor webhook ingestion for first 24 hours
3. Verify transaction categorization accuracy
4. Run backfill for historical data
5. Check for any errors or edge cases

### 8.3 Monitoring

Set up monitoring for:

- **Webhook delivery rate**: Track `shopify-webhook` invocations
- **HMAC verification failures**: Alert on repeated failures
- **Transaction ingestion rate**: Monitor `upserted` count
- **Category distribution**: Verify revenue/contra-revenue split
- **Error rate**: Track 4xx/5xx responses

```bash
# View recent logs
supabase functions logs shopify-webhook --tail

# Check for errors
supabase functions logs shopify-webhook | grep -i error
```

## Troubleshooting

### OAuth Redirect Fails

**Symptom**: Redirect to Shopify fails or returns to app with error

**Solutions**:
- Verify `SHOPIFY_APP_HOST` matches your domain exactly
- Check redirect URI is whitelisted in Shopify app settings
- Ensure state parameter is not expired (10 min TTL)
- Check browser console for JavaScript errors

### Webhook Not Receiving Events

**Symptom**: Orders created but no transactions ingested

**Solutions**:
- Verify webhook URL is publicly accessible
- Check HMAC secret matches `SHOPIFY_API_SECRET`
- Confirm webhook subscriptions are active in Shopify admin
- Test webhook endpoint manually with curl
- Check Edge Function logs for incoming requests

### HMAC Verification Fails

**Symptom**: Webhooks rejected with 401 Unauthorized

**Solutions**:
- Verify `SHOPIFY_API_SECRET` is set correctly in Edge Function secrets
- Check that raw body is used for HMAC (not parsed JSON)
- Ensure no middleware is modifying the request body
- Test HMAC computation with known payload

### Transactions Not Categorized

**Symptom**: Transactions ingested but category_id is NULL

**Solutions**:
- Verify ecommerce taxonomy migration (015_ecommerce_taxonomy.sql) was applied
- Check category UUIDs in transform match database
- Ensure `ECOMMERCE_CATEGORIES` constants are correct
- Run categorization job manually if needed

### Backfill Timeout

**Symptom**: Bulk operation never completes or times out

**Solutions**:
- Reduce `daysBack` parameter (try 30 or 60 instead of 180)
- Check Shopify API rate limits (may be throttled)
- Verify GraphQL query syntax for current API version
- Check Edge Function timeout settings (increase if needed)

### Duplicate Transactions

**Symptom**: Same order creates multiple transaction rows

**Solutions**:
- Verify `provider_tx_id` is unique and consistent
- Check that `(org_id, provider_tx_id)` unique constraint exists
- Ensure webhooks and backfill use same ID format
- Review upsert logic in `upsertTransactions`

## Rollback Procedure

If issues arise, rollback in reverse order:

1. **Disable webhooks** in Shopify admin (don't delete, just disable)
2. **Disconnect stores** via UI or database
3. **Revert Edge Functions** to previous version:
   ```bash
   supabase functions deploy shopify-webhook --project-ref your-project-ref --version previous
   ```
4. **Revert migration** if needed (only if it causes issues):
   ```sql
   ALTER TABLE transactions DROP CONSTRAINT transactions_source_check;
   ALTER TABLE transactions ADD CONSTRAINT transactions_source_check 
     CHECK (source IN ('plaid', 'square', 'manual'));
   ```

## Support and Resources

- **Shopify API Docs**: https://shopify.dev/docs/api
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Internal Docs**: See `apps/edge/shopify/README.md`
- **Test Suite**: Run `deno test apps/edge/_shared/shopify-transform.spec.ts`

## Next Steps

After successful deployment:

1. Monitor first week of production usage
2. Collect feedback on categorization accuracy
3. Plan enhancements:
   - Shopify Payments payouts reconciliation
   - Multi-currency support
   - Inventory/COGS tracking
   - Additional marketplace integrations (Amazon, eBay)




