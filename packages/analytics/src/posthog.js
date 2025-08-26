let posthogServerInstance = null;
let posthogBrowserInstance = null;
/**
 * Get PostHog server client instance (using posthog-node)
 * Safe to use in server-side contexts and Edge Functions
 */
export function getPosthogClientServer() {
    // Only initialize in server environment
    if (typeof window !== 'undefined') {
        return null;
    }
    if (!posthogServerInstance) {
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.POSTHOG_KEY;
        const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || process.env.POSTHOG_HOST || 'https://us.i.posthog.com';
        if (!key) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('PostHog key not found in environment variables');
                return null;
            }
            throw new Error('PostHog key is required in production');
        }
        try {
            const { PostHog } = require('posthog-node');
            posthogServerInstance = new PostHog(key, {
                host,
            });
        }
        catch (error) {
            console.error('Failed to initialize PostHog server client:', error);
            return null;
        }
    }
    return posthogServerInstance;
}
/**
 * Get PostHog browser client instance (using posthog-js)
 * Lazy singleton that only initializes in browser environment
 */
export function getPosthogClientBrowser() {
    // Only initialize in browser environment
    if (typeof window === 'undefined') {
        return null;
    }
    if (!posthogBrowserInstance) {
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
        if (!key) {
            console.warn('NEXT_PUBLIC_POSTHOG_KEY not found, PostHog browser client not initialized');
            return null;
        }
        try {
            const posthogJS = require('posthog-js');
            posthogJS.init(key, {
                api_host: host,
                person_profiles: 'identified_only',
                capture_pageview: false, // Disable automatic pageview capture
                capture_pageleave: true,
            });
            posthogBrowserInstance = posthogJS;
        }
        catch (error) {
            console.error('Failed to initialize PostHog browser client:', error);
            return null;
        }
    }
    return posthogBrowserInstance;
}
/**
 * Gracefully shutdown PostHog server client
 * Should be called when server is shutting down
 */
export async function shutdownPosthogServer() {
    if (posthogServerInstance) {
        try {
            await posthogServerInstance.shutdown();
            posthogServerInstance = null;
        }
        catch (error) {
            console.error('Error shutting down PostHog server client:', error);
        }
    }
}
//# sourceMappingURL=posthog.js.map