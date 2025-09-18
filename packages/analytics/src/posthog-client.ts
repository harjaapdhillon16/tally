import type { PostHog as PostHogJS } from 'posthog-js';
import { posthog } from 'posthog-js';

let posthogBrowserInstance: PostHogJS | null = null;
let initializationPromise: Promise<PostHogJS | null> | null = null;

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
        loaded: () => {
          // PostHog is fully loaded
          posthogBrowserInstance = posthog;
        }
      });
      // Return posthog immediately, even if not fully loaded
      posthogBrowserInstance = posthog;
    } catch (error) {
      console.error('Failed to initialize PostHog browser client:', error);
      return null;
    }
  }

  return posthogBrowserInstance;
}

/**
 * Async version that waits for PostHog to be fully initialized
 * Use this for non-blocking initialization in components
 */
export function getPosthogClientBrowserAsync(): Promise<PostHogJS | null> {
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Only initialize in browser environment
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!key) {
    console.warn('NEXT_PUBLIC_POSTHOG_KEY not found, PostHog browser client not initialized');
    return Promise.resolve(null);
  }

  // Create initialization promise
  initializationPromise = new Promise((resolve) => {
    try {
      posthog.init(key, {
        api_host: host,
        person_profiles: 'identified_only',
        capture_pageview: false,
        capture_pageleave: true,
        loaded: () => {
          posthogBrowserInstance = posthog;
          resolve(posthog);
        }
      });

      // Fallback timeout - resolve after 3 seconds even if not loaded
      setTimeout(() => {
        if (!posthogBrowserInstance) {
          posthogBrowserInstance = posthog;
          resolve(posthog);
        }
      }, 3000);

    } catch (error) {
      console.error('Failed to initialize PostHog browser client:', error);
      resolve(null);
    }
  });

  return initializationPromise;
}