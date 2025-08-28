import type { BrowserOptions, NodeOptions } from '@sentry/nextjs';
import * as Sentry from '@sentry/nextjs';

/**
 * Initialize Sentry for Next.js server-side
 * Safe to call multiple times - Sentry handles initialization internally
 */
export function initSentryServer(options?: Partial<NodeOptions>): void {
  // Only initialize in server environment
  if (typeof window !== 'undefined') {
    return;
  }

  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Sentry DSN not found in environment variables');
      return;
    }
    throw new Error('Sentry DSN is required in production');
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV === 'development',
      
      // Integration configurations
      integrations: [
        // Add any server-specific integrations here
      ],
      
      // Performance monitoring
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Filter out health checks and other noise
      beforeSend(event: any, _hint: any) {
        // Filter out health check requests
        if (event.request?.url?.includes('/api/health')) {
          return null;
        }
        return event;
      },
      
      ...options,
    });
  } catch (error) {
    console.error('Failed to initialize Sentry server:', error);
  }
}

/**
 * Initialize Sentry for Next.js client-side
 * Safe to call multiple times - Sentry handles initialization internally
 */
export function initSentryClient(options?: Partial<BrowserOptions>): void {
  // Only initialize in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn('NEXT_PUBLIC_SENTRY_DSN not found, Sentry client not initialized');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV === 'development',
      
      // Integration configurations
      integrations: [
        // Add any browser-specific integrations here
      ],
      
      // Performance monitoring
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Replay for better debugging (optional)
      replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      ...options,
    });
  } catch (error) {
    console.error('Failed to initialize Sentry client:', error);
  }
}

/**
 * Helper to capture exception with additional context
 * Works in both server and client environments
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  try {
    if (context) {
      Sentry.withScope((scope: any) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch (sentryError) {
    console.error('Failed to capture exception with Sentry:', sentryError);
    console.error('Original error:', error);
  }
}

/**
 * Helper to capture message with additional context
 * Works in both server and client environments
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>): void {
  try {
    if (context) {
      Sentry.withScope((scope: any) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
        Sentry.captureMessage(message, level);
      });
    } else {
      Sentry.captureMessage(message, level);
    }
  } catch (sentryError) {
    console.error('Failed to capture message with Sentry:', sentryError);
    console.error('Original message:', message);
  }
}

/**
 * Set user context for current Sentry scope
 * Works in both server and client environments
 */
export function setUserContext(user: { id: string; email?: string; username?: string }): void {
  try {
    Sentry.setUser(user);
  } catch (error) {
    console.error('Failed to set Sentry user context:', error);
  }
}