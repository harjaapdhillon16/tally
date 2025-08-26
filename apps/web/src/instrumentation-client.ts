import { initSentryClient, getPosthogClientBrowser } from '@nexus/analytics';

// Initialize PostHog for client-side
getPosthogClientBrowser();

// Initialize Sentry for client-side
initSentryClient();

// Re-export Sentry helpers for Next.js integration
export { captureRouterTransitionStart as onRouterTransitionStart } from '@sentry/nextjs';