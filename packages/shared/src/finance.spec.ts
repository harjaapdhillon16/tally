import { describe, expect, test } from 'vitest';
import { sumCents, pctDelta, zScore, toUSD } from './finance';

describe('sumCents', () => {
  test('sums valid cents strings', () => {
    expect(sumCents(['100', '200', '300'])).toBe('600');
  });

  test('handles empty array', () => {
    expect(sumCents([])).toBe('0');
  });

  test('ignores invalid values', () => {
    expect(sumCents(['100', 'invalid', '200', ''])).toBe('300');
  });

  test('handles large numbers without precision loss', () => {
    const largeAmounts = ['999999999999', '1'];
    expect(sumCents(largeAmounts)).toBe('1000000000000');
  });

  test('handles negative values', () => {
    expect(sumCents(['-100', '200'])).toBe('100');
  });
});

describe('pctDelta', () => {
  test('calculates positive percentage change', () => {
    expect(pctDelta(120, 100)).toBe(20.0);
  });

  test('calculates negative percentage change', () => {
    expect(pctDelta(80, 100)).toBe(-20.0);
  });

  test('returns 0 when previous value is 0', () => {
    expect(pctDelta(100, 0)).toBe(0);
  });

  test('returns 0 when both values are 0', () => {
    expect(pctDelta(0, 0)).toBe(0);
  });

  test('rounds to 1 decimal place', () => {
    expect(pctDelta(333, 1000)).toBe(-66.7);
  });
});

describe('zScore', () => {
  test('calculates z-score for normal distribution', () => {
    const samples = [10, 12, 14, 16, 18];
    const result = zScore(20, samples);
    expect(result).toBeCloseTo(2.12, 2);
  });

  test('returns 0 for insufficient samples', () => {
    const samples = [10, 12];
    expect(zScore(15, samples)).toBe(0);
  });

  test('returns 0 for zero variance', () => {
    const samples = [10, 10, 10, 10, 10];
    expect(zScore(10, samples)).toBe(0);
  });

  test('returns 0 for empty samples', () => {
    expect(zScore(15, [])).toBe(0);
  });
});

describe('toUSD', () => {
  test('formats cents as USD currency', () => {
    expect(toUSD('12345')).toBe('$123.45');
  });

  test('formats zero cents', () => {
    expect(toUSD('0')).toBe('$0.00');
  });

  test('formats large amounts', () => {
    expect(toUSD('123456789')).toBe('$1,234,567.89');
  });
});