export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export function createLogger(context: string) {
  return {
    debug: (message: string, metadata?: Record<string, unknown>) =>
      log(LogLevel.DEBUG, message, context, metadata),
    info: (message: string, metadata?: Record<string, unknown>) =>
      log(LogLevel.INFO, message, context, metadata),
    warn: (message: string, metadata?: Record<string, unknown>) =>
      log(LogLevel.WARN, message, context, metadata),
    error: (message: string, metadata?: Record<string, unknown>) =>
      log(LogLevel.ERROR, message, context, metadata),
  };
}

function log(level: LogLevel, message: string, context: string, metadata?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    ...(metadata && { metadata }),
  };

  // In production, send to structured logging service
  // For now, use console with structured output
  console.log(JSON.stringify(entry));

  // TODO: Send to PostHog or other monitoring service
  // if (level === LogLevel.ERROR) {
  //   sendToSentry(entry);
  // }
}