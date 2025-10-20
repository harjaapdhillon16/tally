# Institution Logos

This directory contains logos for financial institutions and POS providers.

## Current Logos

- `bank-generic.png` - Generic bank icon (fallback)
- Additional logos downloaded via `scripts/collect-bank-logos.sh`

## Quick Setup

Download all bank logos automatically:

```bash
./scripts/collect-bank-logos.sh
```

## Adding New Logos

To add logos for additional banks:

1. **Obtain logo** - Download from:
   - **Clearbit**: `https://logo.clearbit.com/[domain].com` (easiest)
   - Bank's official brand/press page (best quality)
   - Google Favicon API: `https://www.google.com/s2/favicons?domain=[domain].com&sz=128`

2. **Format requirements:**
   - PNG format with transparency
   - Size: 64x64px or 128x128px (for retina displays)
   - File size: < 5KB per logo
   - Square aspect ratio

3. **Naming convention:**
   - Use lowercase, dash-separated names
   - Examples: `chase.png`, `bofa.png`, `wellsfargo.png`

4. **Update mapping:**
   - Add entry to `apps/web/src/lib/institution-logos.ts`
   - Use exact institution name from Plaid as key

## Top US Banks (Included in Script)

The following institutions are automatically downloaded by the collection script:
- Chase (`chase.png`)
- Bank of America (`bofa.png`)
- Wells Fargo (`wellsfargo.png`)
- Citibank (`citi.png`)
- U.S. Bank (`usbank.png`)
- Capital One (`capitalone.png`)
- PNC Bank (`pnc.png`)
- TD Bank (`tdbank.png`)
- Truist (`truist.png`)
- USAA (`usaa.png`)
- Charles Schwab (`schwab.png`)
- Navy Federal Credit Union (`navyfederal.png`)
- Ally Bank (`ally.png`)
- American Express (`amex.png`)
- Discover (`discover.png`)

## POS/Payment Providers

- Shopify (`shopify.png`)
- Square (`square.png`)
- Stripe (`stripe.png`)
- PayPal (`paypal.png`)

## Legal Notes

- Only use logos you have rights to use
- Check each institution's brand guidelines
- Consider trademark fair use policies
- For production, obtain proper licensing if needed

