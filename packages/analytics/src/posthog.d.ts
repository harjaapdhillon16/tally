import type { PostHog } from 'posthog-node';
import type { PostHog as PostHogJS } from 'posthog-js';
/**
 * Get PostHog server client instance (using posthog-node)
 * Safe to use in server-side contexts and Edge Functions
 */
export declare function getPosthogClientServer(): PostHog | null;
/**
 * Get PostHog browser client instance (using posthog-js)
 * Lazy singleton that only initializes in browser environment
 */
export declare function getPosthogClientBrowser(): PostHogJS | null;
/**
 * Gracefully shutdown PostHog server client
 * Should be called when server is shutting down
 */
export declare function shutdownPosthogServer(): Promise<void>;
//# sourceMappingURL=posthog.d.ts.map