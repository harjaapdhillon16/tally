// PostHog and Sentry integration for Edge Functions
// Note: These are simple implementations. In production, you might want to use SDKs if available

interface PostHogEvent {
  event: string;
  properties: Record<string, any>;
  distinct_id: string;
  timestamp?: string;
}

interface SentryEvent {
  message: string;
  level: 'info' | 'warning' | 'error' | 'fatal';
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
}

/**
 * Send event to PostHog
 */
export async function trackEvent(event: string, properties: Record<string, any>, userId?: string): Promise<void> {
  const posthogApiKey = Deno.env.get('POSTHOG_API_KEY');
  const posthogHost = Deno.env.get('POSTHOG_HOST') || 'https://app.posthog.com';

  if (!posthogApiKey) {
    console.warn('PostHog tracking skipped - POSTHOG_API_KEY not configured');
    return;
  }

  try {
    const eventData: PostHogEvent = {
      event,
      properties: {
        ...properties,
        $lib: 'nexus-edge-functions',
        $lib_version: '1.0.0',
      },
      distinct_id: userId || 'anonymous',
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(`${posthogHost}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${posthogApiKey}`,
      },
      body: JSON.stringify({
        api_key: posthogApiKey,
        event: eventData.event,
        properties: eventData.properties,
        distinct_id: eventData.distinct_id,
        timestamp: eventData.timestamp,
      }),
    });

    if (!response.ok) {
      console.error('PostHog tracking failed:', await response.text());
    }
  } catch (error) {
    console.error('PostHog tracking error:', error);
  }
}

/**
 * Send error to Sentry
 */
export async function captureException(
  error: Error | string, 
  level: SentryEvent['level'] = 'error',
  context?: { user?: SentryEvent['user']; tags?: Record<string, string>; extra?: Record<string, any> }
): Promise<void> {
  const sentryDsn = Deno.env.get('SENTRY_DSN');
  
  if (!sentryDsn) {
    console.warn('Sentry error capture skipped - SENTRY_DSN not configured');
    return;
  }

  try {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;

    const eventData: SentryEvent & { exception?: any; stacktrace?: any } = {
      message,
      level,
      tags: context?.tags,
      extra: context?.extra,
      user: context?.user,
      timestamp: new Date().toISOString(),
    };

    if (stack) {
      eventData.exception = {
        values: [{
          type: error.constructor.name,
          value: message,
          stacktrace: { frames: parseStackTrace(stack) }
        }]
      };
    }

    // Simple Sentry API call - in production, consider using the Sentry SDK
    const response = await fetch(`${getDsnEndpoint(sentryDsn)}/api/store/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': getSentryAuthHeader(sentryDsn),
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      console.error('Sentry capture failed:', await response.text());
    }
  } catch (captureError) {
    console.error('Sentry capture error:', captureError);
  }
}

function parseStackTrace(stack: string): any[] {
  // Simple stack trace parsing - improve as needed
  return stack.split('\n').map((line, index) => ({
    filename: line.includes('(') ? line.split('(')[1]?.split(':')[0] : 'unknown',
    function: line.includes('at ') ? line.split('at ')[1]?.split(' ')[0] : 'anonymous',
    lineno: index + 1,
  }));
}

function getDsnEndpoint(dsn: string): string {
  // Extract endpoint from DSN - simplified version
  const url = new URL(dsn);
  return `${url.protocol}//${url.host}`;
}

function getSentryAuthHeader(dsn: string): string {
  // Extract auth info from DSN - simplified version
  const url = new URL(dsn);
  const key = url.username;
  const projectId = url.pathname.split('/').pop();
  
  return `Sentry sentry_version=7, sentry_client=nexus-edge-functions/1.0.0, sentry_key=${key}, sentry_secret=`;
}

/**
 * Track Plaid sync metrics
 */
export async function trackPlaidSync(
  connectionId: string,
  operation: 'sync' | 'backfill' | 'webhook',
  result: { success: boolean; inserted?: number; updated?: number; removed?: number; error?: string },
  orgId?: string
): Promise<void> {
  await trackEvent('plaid_sync_completed', {
    connection_id: connectionId,
    operation,
    success: result.success,
    inserted_count: result.inserted || 0,
    updated_count: result.updated || 0,
    removed_count: result.removed || 0,
    error_message: result.error,
  }, orgId);

  if (!result.success && result.error) {
    await captureException(result.error, 'error', {
      tags: {
        operation,
        connection_id: connectionId,
      },
      extra: {
        result,
      },
    });
  }
}

/**
 * Track connection events
 */
export async function trackConnection(
  event: 'connected' | 'disconnected' | 'error',
  connectionId: string,
  provider: string,
  orgId?: string,
  error?: string
): Promise<void> {
  await trackEvent('connection_event', {
    event,
    connection_id: connectionId,
    provider,
    error_message: error,
  }, orgId);

  if (event === 'error' && error) {
    await captureException(error, 'warning', {
      tags: {
        connection_id: connectionId,
        provider,
      },
    });
  }
}