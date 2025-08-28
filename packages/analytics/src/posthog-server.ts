import type { PostHog } from 'posthog-node';

let posthogServerInstance: PostHog | null = null;

/**
 * Get PostHog server client instance (using posthog-node)
 * Safe to use in server-side contexts and Edge Functions
 */
export async function getPosthogClientServer(): Promise<PostHog | null> {
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
      const { PostHog } = await import('posthog-node');
      posthogServerInstance = new PostHog(key, {
        host,
      });
    } catch (error) {
      console.error('Failed to initialize PostHog server client:', error);
      return null;
    }
  }

  return posthogServerInstance;
}

/**
 * Gracefully shutdown PostHog server client
 * Should be called when server is shutting down
 */
export async function shutdownPosthogServer(): Promise<void> {
  if (posthogServerInstance) {
    try {
      await posthogServerInstance.shutdown();
      posthogServerInstance = null;
    } catch (error) {
      console.error('Error shutting down PostHog server client:', error);
    }
  }
}