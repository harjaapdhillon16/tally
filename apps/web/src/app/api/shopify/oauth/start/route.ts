// app/api/shopify/oauth/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shop = url.searchParams.get("shop");
  const hmac = url.searchParams.get("hmac");
  const timestamp = url.searchParams.get("timestamp");

  if (!shop) {
    return NextResponse.json(
      { error: "Shop parameter required" },
      { status: 400 }
    );
  }

  // Verify HMAC of initial request
  if (hmac && timestamp) {
    const queryParams: Record<string, string> = { shop, timestamp };
    const message = Object.keys(queryParams)
      .sort()
      .map((key) => `${key}=${queryParams[key]}`)
      .join("&");

    const generatedHash = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
      .update(message)
      .digest("hex");

    if (generatedHash !== hmac) {
      return NextResponse.json(
        { error: "HMAC validation failed" },
        { status: 403 }
      );
    }
  }

  // Generate state for security
  const state = crypto.randomBytes(16).toString("hex");
  // TODO: Store state in session/cookie for verification later

  // Define scopes your app needs
  const scopes = "read_products,write_products";
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/oauth/callback`;

  // Build Shopify authorization URL
  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", process.env.SHOPIFY_API_KEY!);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}