import { describe, it, expect } from 'vitest';
import { ErrorCode, createErrorResponse, USER_FRIENDLY_MESSAGES } from './errors.js';

describe('Error Utilities', () => {
  describe('createErrorResponse', () => {
    it('should create error response with basic fields', () => {
      const response = createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        'Access denied'
      );

      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      // Parse response body
      return response.json().then(body => {
        expect(body.error).toMatchObject({
          code: ErrorCode.UNAUTHORIZED,
          message: 'Access denied',
          timestamp: expect.any(String),
        });
        expect(body.error.details).toBeUndefined();
      });
    });

    it('should create error response with custom status code', () => {
      const response = createErrorResponse(
        ErrorCode.INVALID_REQUEST_DATA,
        'Bad request',
        400
      );

      expect(response.status).toBe(400);
    });

    it('should include details when provided', () => {
      const details = { field: 'email', reason: 'Invalid format' };
      const response = createErrorResponse(
        ErrorCode.INVALID_REQUEST_DATA,
        'Validation failed',
        400,
        details
      );

      return response.json().then(body => {
        expect(body.error.details).toEqual(details);
      });
    });

    it('should not include details field when not provided', () => {
      const response = createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        'Access denied'
      );

      return response.json().then(body => {
        expect(body.error).not.toHaveProperty('details');
      });
    });

    it('should include timestamp in ISO format', () => {
      const response = createErrorResponse(
        ErrorCode.CONNECTION_NOT_FOUND,
        'Connection not found'
      );

      return response.json().then(body => {
        const timestamp = body.error.timestamp;
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(new Date(timestamp).getTime()).toBeGreaterThan(0);
      });
    });
  });

  describe('USER_FRIENDLY_MESSAGES', () => {
    it('should have messages for all error codes', () => {
      const errorCodes = Object.values(ErrorCode);
      const messageKeys = Object.keys(USER_FRIENDLY_MESSAGES);

      expect(messageKeys).toHaveLength(errorCodes.length);

      errorCodes.forEach(code => {
        expect(USER_FRIENDLY_MESSAGES).toHaveProperty(code);
        expect(USER_FRIENDLY_MESSAGES[code]).toBeTypeOf('string');
        expect(USER_FRIENDLY_MESSAGES[code].length).toBeGreaterThan(0);
      });
    });

    it('should provide user-friendly messages', () => {
      expect(USER_FRIENDLY_MESSAGES[ErrorCode.UNAUTHORIZED])
        .toBe('Please sign in to continue');
      expect(USER_FRIENDLY_MESSAGES[ErrorCode.PLAID_RATE_LIMIT])
        .toBe('Too many requests. Please wait a moment and try again.');
      expect(USER_FRIENDLY_MESSAGES[ErrorCode.CONNECTION_NOT_FOUND])
        .toBe('Bank connection not found. Please connect your account first.');
    });
  });
});