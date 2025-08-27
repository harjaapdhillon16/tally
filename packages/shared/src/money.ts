/**
 * Money utilities for exact decimal arithmetic
 * 
 * Following CLAUDE.md F-1: Use exact decimal arithmetic for all financial calculations.
 * Never use floating point for money.
 */

/**
 * Converts a monetary amount to cents as a string to avoid floating point errors
 * @param amount - The amount as number or string
 * @returns String representation of amount in cents
 */
export function toCentsString(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) throw new Error('Invalid amount');
  
  // Round to nearest cent and convert to string
  return Math.round(Math.abs(num) * 100).toString();
}

/**
 * Converts cents string back to dollar amount
 * @param centsStr - Amount in cents as string
 * @returns Dollar amount as number
 */
export function fromCentsString(centsStr: string): number {
  const cents = parseInt(centsStr, 10);
  if (isNaN(cents)) throw new Error('Invalid cents string');
  return cents / 100;
}

/**
 * Formats a cents string as currency
 * @param centsStr - Amount in cents as string
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(centsStr: string, currency: string = 'USD'): string {
  const amount = fromCentsString(centsStr);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Adds two amounts in cents (as strings)
 * @param a - First amount in cents
 * @param b - Second amount in cents
 * @returns Sum in cents as string
 */
export function addCents(a: string, b: string): string {
  const aNum = parseInt(a, 10);
  const bNum = parseInt(b, 10);
  if (isNaN(aNum) || isNaN(bNum)) throw new Error('Invalid cents strings');
  return (aNum + bNum).toString();
}

/**
 * Subtracts two amounts in cents (as strings)
 * @param a - First amount in cents
 * @param b - Second amount in cents  
 * @returns Difference in cents as string
 */
export function subtractCents(a: string, b: string): string {
  const aNum = parseInt(a, 10);
  const bNum = parseInt(b, 10);
  if (isNaN(aNum) || isNaN(bNum)) throw new Error('Invalid cents strings');
  return (aNum - bNum).toString();
}