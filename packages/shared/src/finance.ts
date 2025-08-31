/**
 * Financial calculation utilities for dashboard metrics
 * 
 * Following CLAUDE.md F-1: Use exact decimal arithmetic for all financial calculations.
 * Building on money.ts utilities for basic arithmetic.
 */

import { formatCurrency } from './money.js';

/**
 * Sums an array of cents strings, ignoring invalid values
 * @param strings - Array of amounts in cents as strings
 * @returns Sum in cents as string
 */
export function sumCents(strings: string[]): string {
  let total = 0n;
  
  for (const str of strings) {
    if (!str || typeof str !== 'string') continue;
    
    const parsed = parseInt(str, 10);
    if (!isNaN(parsed)) {
      total += BigInt(parsed);
    }
  }
  
  return total.toString();
}

/**
 * Calculates percentage delta between two numeric values
 * @param curr - Current value
 * @param prev - Previous value
 * @returns Percentage change (positive means increase), 0 if prev is 0
 */
export function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return 0;
  const delta = ((curr - prev) / prev) * 100;
  return Math.round(delta * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculates z-score for a value against a sample set
 * @param value - The value to score
 * @param samples - Array of sample values for baseline
 * @returns Z-score, or 0 if insufficient samples or no variance
 */
export function zScore(value: number, samples: number[]): number {
  if (samples.length < 4) return 0;
  
  const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
  const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
  const stddev = Math.sqrt(variance);
  
  if (stddev === 0) return 0;
  
  return (value - mean) / stddev;
}

/**
 * Formats cents string as USD currency
 * @param cents - Amount in cents as string
 * @returns Formatted USD string (e.g., "$123.45")
 */
export function toUSD(cents: string): string {
  return formatCurrency(cents, 'USD');
}