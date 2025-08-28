import type { PostHog as PostHogJS } from 'posthog-js';
import { posthog } from 'posthog-js';

let posthogBrowserInstance: PostHogJS | null = null;

/**
 * Get PostHog browser client instance (using posthog-js)
 * Lazy singleton that only initializes in browser environment
 */
export function getPosthogClientBrowser(): PostHogJS | null {
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
      posthog.init(key, {
        api_host: host,
        person_profiles: 'identified_only',
        capture_pageview: false, // Disable automatic pageview capture
        capture_pageleave: true,
      });
      posthogBrowserInstance = posthog;
    } catch (error) {
      console.error('Failed to initialize PostHog browser client:', error);
      return null;
    }
  }

  return posthogBrowserInstance;
}