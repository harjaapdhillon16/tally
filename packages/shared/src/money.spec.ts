import { describe, expect, test } from 'vitest';
import { 
  toCentsString, 
  fromCentsString, 
  formatCurrency, 
  addCents, 
  subtractCents 
} from './money.js';

describe('toCentsString', () => {
  test('converts dollar amounts to cents strings', () => {
    expect(toCentsString(1.23)).toBe('123');
    expect(toCentsString(0)).toBe('0');
    expect(toCentsString(100)).toBe('10000');
    expect(toCentsString(0.01)).toBe('1');
  });

  test('handles string inputs', () => {
    expect(toCentsString('1.23')).toBe('123');
    expect(toCentsString('0')).toBe('0');
    expect(toCentsString('100')).toBe('10000');
  });

  test('rounds to nearest cent', () => {
    expect(toCentsString(1.234)).toBe('123');
    expect(toCentsString(1.235)).toBe('124');
    expect(toCentsString(1.236)).toBe('124');
  });

  test('handles negative amounts by taking absolute value', () => {
    expect(toCentsString(-1.23)).toBe('123');
    expect(toCentsString(-100)).toBe('10000');
  });

  test('throws for invalid input', () => {
    expect(() => toCentsString('invalid')).toThrow('Invalid amount');
    expect(() => toCentsString(NaN)).toThrow('Invalid amount');
  });
});

describe('fromCentsString', () => {
  test('converts cents strings to dollar amounts', () => {
    expect(fromCentsString('123')).toBe(1.23);
    expect(fromCentsString('0')).toBe(0);
    expect(fromCentsString('10000')).toBe(100);
    expect(fromCentsString('1')).toBe(0.01);
  });

  test('throws for invalid input', () => {
    expect(() => fromCentsString('invalid')).toThrow('Invalid cents string');
    expect(() => fromCentsString('')).toThrow('Invalid cents string');
  });
});

describe('formatCurrency', () => {
  test('formats cents strings as USD currency by default', () => {
    expect(formatCurrency('123')).toBe('$1.23');
    expect(formatCurrency('0')).toBe('$0.00');
    expect(formatCurrency('10000')).toBe('$100.00');
  });

  test('formats with different currencies', () => {
    expect(formatCurrency('123', 'EUR')).toBe('€1.23');
    expect(formatCurrency('123', 'GBP')).toBe('£1.23');
  });
});

describe('addCents', () => {
  test('adds two cents strings', () => {
    expect(addCents('123', '456')).toBe('579');
    expect(addCents('0', '100')).toBe('100');
    expect(addCents('100', '0')).toBe('100');
  });

  test('throws for invalid input', () => {
    expect(() => addCents('invalid', '100')).toThrow('Invalid cents strings');
    expect(() => addCents('100', 'invalid')).toThrow('Invalid cents strings');
  });
});

describe('subtractCents', () => {
  test('subtracts two cents strings', () => {
    expect(subtractCents('456', '123')).toBe('333');
    expect(subtractCents('100', '0')).toBe('100');
    expect(subtractCents('100', '100')).toBe('0');
  });

  test('handles negative results', () => {
    expect(subtractCents('123', '456')).toBe('-333');
  });

  test('throws for invalid input', () => {
    expect(() => subtractCents('invalid', '100')).toThrow('Invalid cents strings');
    expect(() => subtractCents('100', 'invalid')).toThrow('Invalid cents strings');
  });
});

describe('money utilities precision', () => {
  test('avoids floating point precision errors', () => {
    // Common floating point error: 0.1 + 0.2 = 0.30000000000000004
    const result = addCents(toCentsString(0.1), toCentsString(0.2));
    expect(fromCentsString(result)).toBe(0.3);
    
    // Another precision issue: 1.23 * 100 in JavaScript
    expect(toCentsString(1.23)).toBe('123');
  });

  test('maintains precision through conversion chain', () => {
    const original = 1234.56;
    const cents = toCentsString(original);
    const converted = fromCentsString(cents);
    expect(converted).toBe(original);
  });
});