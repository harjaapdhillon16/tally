import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LogLevel, createLogger } from './monitoring.js';

describe('Monitoring Utilities', () => {
  const originalConsole = global.console;
  
  beforeEach(() => {
    global.console = {
      ...originalConsole,
      log: vi.fn(),
    };
  });

  afterEach(() => {
    global.console = originalConsole;
    vi.clearAllMocks();
  });

  describe('createLogger', () => {
    it('should create logger with context', () => {
      const logger = createLogger('test-service');
      
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
    });

    it('should log debug messages with correct format', () => {
      const logger = createLogger('test-service');
      const metadata = { userId: '123', action: 'test' };
      
      logger.debug('Debug message', metadata);
      
      expect(console.log).toHaveBeenCalledTimes(1);
      const logCall = vi.mocked(console.log).mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry).toMatchObject({
        level: LogLevel.DEBUG,
        message: 'Debug message',
        context: 'test-service',
        metadata,
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      });
    });

    it('should log info messages', () => {
      const logger = createLogger('test-service');
      
      logger.info('Info message');
      
      expect(console.log).toHaveBeenCalledTimes(1);
      const logCall = vi.mocked(console.log).mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.level).toBe(LogLevel.INFO);
      expect(logEntry.message).toBe('Info message');
      expect(logEntry.context).toBe('test-service');
    });

    it('should log warn messages', () => {
      const logger = createLogger('test-service');
      
      logger.warn('Warning message');
      
      expect(console.log).toHaveBeenCalledTimes(1);
      const logCall = vi.mocked(console.log).mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.level).toBe(LogLevel.WARN);
      expect(logEntry.message).toBe('Warning message');
    });

    it('should log error messages', () => {
      const logger = createLogger('test-service');
      
      logger.error('Error message');
      
      expect(console.log).toHaveBeenCalledTimes(1);
      const logCall = vi.mocked(console.log).mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.level).toBe(LogLevel.ERROR);
      expect(logEntry.message).toBe('Error message');
    });

    it('should not include metadata field when not provided', () => {
      const logger = createLogger('test-service');
      
      logger.info('Message without metadata');
      
      const logCall = vi.mocked(console.log).mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry).not.toHaveProperty('metadata');
    });

    it('should include metadata when provided', () => {
      const logger = createLogger('test-service');
      const metadata = { key: 'value', count: 42 };
      
      logger.info('Message with metadata', metadata);
      
      const logCall = vi.mocked(console.log).mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.metadata).toEqual(metadata);
    });

    it('should handle empty metadata object', () => {
      const logger = createLogger('test-service');
      
      logger.info('Message with empty metadata', {});
      
      const logCall = vi.mocked(console.log).mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.metadata).toEqual({});
    });
  });
});