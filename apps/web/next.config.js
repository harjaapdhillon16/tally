// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // keep your existing options
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },

  // Headers: allow Shopify to embed the app (frame-ancestors)
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const styleSourcePolicy = isDev
      ? "style-src 'self' 'unsafe-inline' blob:"
      : "style-src 'self' 'unsafe-inline'";

    const cspDirectives = [
      "default-src 'self'",
      "connect-src 'self' https://*.supabase.co https://us.i.posthog.com https://*.sentry.io https://production.plaid.com https://cdn.plaid.com",
      "script-src 'self' https://cdn.plaid.com https://us.i.posthog.com https://*.sentry.io 'unsafe-inline' 'unsafe-eval'",
      // allow Shopify admin and myshopify stores to embed the app
      "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com",
      "img-src 'self' data: blob: https://*.posthog.com",
      styleSourcePolicy,
      "font-src 'self' data:",
      "frame-src https://cdn.plaid.com",
      "base-uri 'self'",
      "form-action 'self'"
    ];

    if (!isDev) cspDirectives.push("upgrade-insecure-requests");

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspDirectives.join('; ') },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Replace DENY with ALLOWALL so Shopify can iframe. CSP frame-ancestors is authoritative.
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' }
        ]
      }
    ];
  },

  // PostHog rewrites
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' }
    ];
  },

  skipTrailingSlashRedirect: true
};

// Sentry wrapper options (kept from your TS file)
const sentryOptions = {
  org: "nexus-bc",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  disableLogger: true,
  automaticVercelMonitors: true
};

module.exports = withSentryConfig(nextConfig, sentryOptions);
