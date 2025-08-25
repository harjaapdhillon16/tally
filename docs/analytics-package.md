# Analytics Package

The analytics package (`@nexus/analytics`) provides unified observability and monitoring for the Nexus platform, integrating PostHog for user analytics, Sentry for error monitoring, and Langfuse for LLM observability.

## Overview

The analytics package centralizes all monitoring and observability concerns into a single, well-tested package that can be used across the entire Nexus platform. It provides safe SSR/CSR handling, graceful fallbacks for missing configuration, and type-safe interfaces.

### Key Components

- **PostHog**: User behavior analytics and feature flags
- **Sentry**: Error monitoring, performance tracking, and crash reporting  
- **Langfuse**: LLM prompt/response monitoring and evaluation

## Architecture

```
packages/analytics/
├── src/
│   ├── posthog.ts      # PostHog server & browser clients
│   ├── sentry.ts       # Sentry initialization & helpers
│   ├── langfuse.ts     # Langfuse server-only client
│   └── index.ts        # Unified exports
├── package.json
├── tsconfig.json
└── eslint.config.mjs
```

## Environment Variables

### PostHog Configuration
```bash
# Required for browser analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here

# Optional, defaults to https://us.i.posthog.com  
NEXT_PUBLIC_POSTHOG_HOST=https://your-posthog-instance.com

# Server-only key (optional, falls back to public key)
POSTHOG_KEY=your_server_key_here
POSTHOG_HOST=https://your-posthog-instance.com
```

### Sentry Configuration
```bash
# Required for error monitoring
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
NEXT_PUBLIC_SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id

# Optional for source map uploads
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

### Langfuse Configuration
```bash
# Required for LLM monitoring (server-only)
LANGFUSE_PUBLIC_KEY=pk_your_public_key
LANGFUSE_SECRET_KEY=sk_your_secret_key

# Optional, defaults to https://cloud.langfuse.com
LANGFUSE_BASE_URL=https://your-langfuse-instance.com
```

## Usage

### PostHog Integration

#### Server-Side Usage
```typescript
import { getPosthogClientServer } from '@nexus/analytics';

export async function trackServerEvent(userId: string, event: string) {
  const posthog = getPosthogClientServer();
  if (posthog) {
    posthog.capture({
      distinctId: userId,
      event,
      properties: {
        source: 'server'
      }
    });
  }
}
```

#### Browser-Side Usage
```typescript
import { getPosthogClientBrowser } from '@nexus/analytics';

export function trackClientEvent(event: string, properties?: Record<string, any>) {
  const posthog = getPosthogClientBrowser();
  if (posthog) {
    posthog.capture(event, properties);
  }
}
```

### Sentry Integration

#### Initialization (apps/web)
The web app automatically initializes Sentry through the configuration files:

- `sentry.client.config.ts` - Browser-side initialization
- `sentry.server.config.ts` - Server-side initialization  
- `sentry.edge.config.ts` - Edge runtime initialization

#### Error Handling
```typescript
import { captureException, captureMessage, setUserContext } from '@nexus/analytics';

// Capture exceptions with context
try {
  await riskyOperation();
} catch (error) {
  captureException(error as Error, {
    userId: user.id,
    operation: 'riskyOperation'
  });
}

// Capture messages
captureMessage('Payment processed successfully', 'info', {
  paymentId,
  amount
});

// Set user context for error tracking
setUserContext({
  id: user.id,
  email: user.email,
  username: user.username
});
```

### Langfuse Integration (Server-Only)

#### LLM Monitoring
```typescript
import { createTrace, createGeneration, scoreTrace, getLangfuse } from '@nexus/analytics';

// Create a trace for an LLM workflow
const trace = createTrace('transaction-categorization', {
  transactionId: 'tx_123',
  description: 'Coffee shop purchase'
});

if (trace) {
  // Create a generation for the LLM call
  const generation = createGeneration(
    trace.id,
    'openai-categorization',
    {
      model: 'gpt-4',
      prompt: 'Categorize this transaction...'
    }
  );

  if (generation) {
    // Update with LLM response
    generation.end({
      output: { category: 'Food & Dining', confidence: 0.95 }
    });

    // Score the result
    scoreTrace(trace.id, 'accuracy', 0.95, 'High confidence categorization');
  }

  trace.update({
    output: { category: 'Food & Dining' }
  });
}
```

## Integration Points

### Next.js App Router

The analytics package integrates seamlessly with Next.js App Router:

1. **Automatic Error Boundary**: Sentry automatically captures unhandled errors
2. **Performance Monitoring**: Tracks Core Web Vitals and API response times
3. **User Session Tracking**: PostHog tracks user sessions and page views
4. **Server Action Monitoring**: Track server actions and API routes

### Supabase Edge Functions

Use the server-side clients in Edge Functions:

```typescript
import { getPosthogClientServer, captureException } from '@nexus/analytics';

export default async function handler(req: Request) {
  try {
    const posthog = getPosthogClientServer();
    posthog?.capture({
      distinctId: 'system',
      event: 'edge_function_called',
      properties: { function: 'webhook-handler' }
    });
    
    // Your edge function logic here
    
  } catch (error) {
    captureException(error as Error, { context: 'edge-function' });
    throw error;
  }
}
```

## Development vs Production

### Development Mode
- Missing API keys log warnings but don't throw errors
- Debug mode enabled for detailed logging
- Higher sample rates for testing

### Production Mode  
- Missing required API keys throw errors during initialization
- Optimized sample rates for performance
- Error reporting fully enabled

## Error Handling & Fallbacks

All analytics functions are designed to fail gracefully:

```typescript
// Safe to call even if PostHog is not configured
const posthog = getPosthogClientServer(); // Returns null if not configured
posthog?.capture(...); // Uses optional chaining

// Sentry functions handle their own errors
captureException(error); // Never throws, always safe to call

// Langfuse returns null if not configured
const langfuse = getLangfuse(); // Returns null in browser or if not configured
```

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Error Rates** (Sentry)
   - Application errors by route
   - Unhandled promise rejections
   - Performance issues

2. **User Behavior** (PostHog)
   - Feature adoption rates
   - User journey funnels
   - A/B test results

3. **LLM Performance** (Langfuse)
   - Response times and token usage
   - Categorization accuracy scores
   - Prompt effectiveness

### Setting Up Alerts

Configure alerts in each platform:

- **Sentry**: Set up error rate and performance alerts
- **PostHog**: Create funnels and trend alerts  
- **Langfuse**: Monitor token usage and latency

## Performance Considerations

### Bundle Size Impact
- PostHog browser client: ~50KB gzipped
- Sentry Next.js SDK: ~40KB gzipped
- Langfuse is server-only (no browser bundle impact)

### Initialization Strategy
- **Lazy Loading**: Clients initialize only when first used
- **Environment Checks**: Browser-only code never runs on server
- **Graceful Degradation**: Analytics failures never impact core functionality

## Shutdown Handling

For graceful shutdowns (especially important for serverless):

```typescript
import { shutdownPosthogServer, shutdownLangfuse } from '@nexus/analytics';

// In your shutdown handler
async function gracefulShutdown() {
  await Promise.all([
    shutdownPosthogServer(),
    shutdownLangfuse()
  ]);
}
```

## Testing Considerations

### Unit Testing
Analytics functions are designed to be easily testable:

```typescript
// Mock the analytics clients in tests
jest.mock('@nexus/analytics', () => ({
  getPosthogClientServer: () => null, // Disable in tests
  captureException: jest.fn(), // Mock Sentry calls
  getLangfuse: () => null // Disable Langfuse in tests
}));
```

### Integration Testing
- Use test environment configurations
- Verify analytics calls without impacting production data
- Test error handling paths

## Security Considerations

- **API Keys**: Store in environment variables, never commit to code
- **User Privacy**: Respect user consent and data retention policies
- **Data Sanitization**: Never log sensitive information (passwords, tokens)
- **GDPR Compliance**: Configure data retention and deletion policies

## Troubleshooting

### Common Issues

1. **"PostHog key not found"**: Set `NEXT_PUBLIC_POSTHOG_KEY` in `.env.local`
2. **Sentry not capturing errors**: Verify `SENTRY_DSN` is set correctly
3. **Langfuse not working**: Check server-only usage and API key configuration
4. **TypeScript errors**: Ensure `@nexus/analytics` dependency is properly installed

### Debug Mode

Enable debug logging by setting environment to development:

```bash
NODE_ENV=development
```

This enables detailed logging for troubleshooting integration issues.

## Migration Guide

When upgrading from individual analytics implementations:

1. **Install Package**: Add `@nexus/analytics` dependency
2. **Environment Variables**: Migrate existing keys to new format
3. **Replace Imports**: Update import statements to use unified package
4. **Test Integration**: Verify analytics data flow in development
5. **Deploy**: Update production environment variables

## Related Documentation

- [Database Package](./database-package.md) - For user event storage
- [CLAUDE.md](../CLAUDE.md) - Development best practices
- [Foundations and Contracts](./0-foundationsandcontracts.md) - Architecture principles