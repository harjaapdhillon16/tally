import type { BrowserOptions, NodeOptions } from '@sentry/nextjs';
/**
 * Initialize Sentry for Next.js server-side
 * Safe to call multiple times - Sentry handles initialization internally
 */
export declare function initSentryServer(options?: Partial<NodeOptions>): void;
/**
 * Initialize Sentry for Next.js client-side
 * Safe to call multiple times - Sentry handles initialization internally
 */
export declare function initSentryClient(options?: Partial<BrowserOptions>): void;
/**
 * Helper to capture exception with additional context
 * Works in both server and client environments
 */
export declare function captureException(error: Error, context?: Record<string, any>): void;
/**
 * Helper to capture message with additional context
 * Works in both server and client environments
 */
export declare function captureMessage(message: string, level?: 'info' | 'warning' | 'error', context?: Record<string, any>): void;
/**
 * Set user context for current Sentry scope
 * Works in both server and client environments
 */
export declare function setUserContext(user: {
    id: string;
    email?: string;
    username?: string;
}): void;
//# sourceMappingURL=sentry.d.ts.map