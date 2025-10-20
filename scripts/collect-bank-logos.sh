#!/bin/bash
# Collect bank and POS provider logos using Clearbit
# Logos are saved to apps/web/public/logos/

set -e

LOGOS_DIR="apps/web/public/logos"

# Create logos directory if it doesn't exist
mkdir -p "$LOGOS_DIR"

echo "📦 Downloading bank logos from Clearbit..."

# Major US Banks
echo "  ⬇️  Chase..."
curl -s https://logo.clearbit.com/chase.com -o "$LOGOS_DIR/chase.png"

echo "  ⬇️  Bank of America..."
curl -s https://logo.clearbit.com/bankofamerica.com -o "$LOGOS_DIR/bofa.png"

echo "  ⬇️  Wells Fargo..."
curl -s https://logo.clearbit.com/wellsfargo.com -o "$LOGOS_DIR/wellsfargo.png"

echo "  ⬇️  Citibank..."
curl -s https://logo.clearbit.com/citi.com -o "$LOGOS_DIR/citi.png"

echo "  ⬇️  U.S. Bank..."
curl -s https://logo.clearbit.com/usbank.com -o "$LOGOS_DIR/usbank.png"

echo "  ⬇️  Capital One..."
curl -s https://logo.clearbit.com/capitalone.com -o "$LOGOS_DIR/capitalone.png"

echo "  ⬇️  PNC Bank..."
curl -s https://logo.clearbit.com/pnc.com -o "$LOGOS_DIR/pnc.png"

echo "  ⬇️  TD Bank..."
curl -s https://logo.clearbit.com/td.com -o "$LOGOS_DIR/tdbank.png"

echo "  ⬇️  Truist..."
curl -s https://logo.clearbit.com/truist.com -o "$LOGOS_DIR/truist.png"

echo "  ⬇️  USAA..."
curl -s https://logo.clearbit.com/usaa.com -o "$LOGOS_DIR/usaa.png"

echo "  ⬇️  Charles Schwab..."
curl -s https://logo.clearbit.com/schwab.com -o "$LOGOS_DIR/schwab.png"

echo "  ⬇️  Navy Federal Credit Union..."
curl -s https://logo.clearbit.com/navyfederal.org -o "$LOGOS_DIR/navyfederal.png"

echo "  ⬇️  Ally Bank..."
curl -s https://logo.clearbit.com/ally.com -o "$LOGOS_DIR/ally.png"

# Credit Cards
echo "  ⬇️  American Express..."
curl -s https://logo.clearbit.com/americanexpress.com -o "$LOGOS_DIR/amex.png"

echo "  ⬇️  Discover..."
curl -s https://logo.clearbit.com/discover.com -o "$LOGOS_DIR/discover.png"

# POS/Payment Providers
echo "  ⬇️  Shopify..."
curl -s https://logo.clearbit.com/shopify.com -o "$LOGOS_DIR/shopify.png"

echo "  ⬇️  Square..."
curl -s https://logo.clearbit.com/squareup.com -o "$LOGOS_DIR/square.png"

echo "  ⬇️  Stripe..."
curl -s https://logo.clearbit.com/stripe.com -o "$LOGOS_DIR/stripe.png"

echo "  ⬇️  PayPal..."
curl -s https://logo.clearbit.com/paypal.com -o "$LOGOS_DIR/paypal.png"

# Create generic bank fallback icon (simple placeholder)
echo "  📝 Creating generic bank icon..."
cat > "$LOGOS_DIR/bank-generic.png.txt" << 'EOF'
Note: Create a generic bank icon placeholder image at bank-generic.png
You can use any 64x64px PNG with a bank/building icon.
EOF

echo ""
echo "✅ Bank logos downloaded to $LOGOS_DIR/"
echo ""
echo "Next steps:"
echo "  1. Review downloaded logos in $LOGOS_DIR/"
echo "  2. Create or download a generic bank icon as 'bank-generic.png'"
echo "  3. Test by connecting a bank account in your app"
echo ""
echo "Note: Some logos may not be available from Clearbit."
echo "You may need to download them manually from official sources."

