import { describe, test, expect } from "vitest";
import fc from "fast-check";

/**
 * Property-based tests for integer-cents arithmetic invariants
 * Ensures financial calculations maintain precision
 */

describe("integer-cents arithmetic invariants", () => {
  describe("cents to dollars conversion", () => {
    test("converting cents to dollars and back preserves value", () => {
      fc.assert(
        fc.property(fc.integer({ min: -100000000, max: 100000000 }), (cents) => {
          const dollars = cents / 100;
          const centsBack = Math.round(dollars * 100);

          expect(centsBack).toBe(cents);
        })
      );
    });

    test("string cents to number conversion is safe", () => {
      fc.assert(
        fc.property(fc.integer({ min: -100000000, max: 100000000 }), (cents) => {
          const centsStr = cents.toString();
          const parsed = parseInt(centsStr, 10);

          expect(parsed).toBe(cents);
          expect(Number.isInteger(parsed)).toBe(true);
        })
      );
    });

    test("dollars formatting is consistent", () => {
      fc.assert(
        fc.property(fc.integer({ min: -100000000, max: 100000000 }), (cents) => {
          const dollars = (cents / 100).toFixed(2);

          // Should always have exactly 2 decimal places
          expect(dollars).toMatch(/^-?\d+\.\d{2}$/);
        })
      );
    });
  });

  describe("addition and subtraction", () => {
    test("addition is commutative", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10000000, max: 10000000 }),
          fc.integer({ min: -10000000, max: 10000000 }),
          (a, b) => {
            expect(a + b).toBe(b + a);
          }
        )
      );
    });

    test("addition is associative", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10000000, max: 10000000 }),
          fc.integer({ min: -10000000, max: 10000000 }),
          fc.integer({ min: -10000000, max: 10000000 }),
          (a, b, c) => {
            expect(a + b + c).toBe(a + (b + c));
          }
        )
      );
    });

    test("subtraction and addition are inverse operations", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10000000, max: 10000000 }),
          fc.integer({ min: -10000000, max: 10000000 }),
          (a, b) => {
            const sum = a + b;
            expect(sum - b).toBe(a);
            expect(sum - a).toBe(b);
          }
        )
      );
    });

    test("zero is the additive identity", () => {
      fc.assert(
        fc.property(fc.integer({ min: -10000000, max: 10000000 }), (a) => {
          expect(a + 0).toBe(a);
          expect(0 + a).toBe(a);
        })
      );
    });

    test("negation is the additive inverse", () => {
      fc.assert(
        fc.property(fc.integer({ min: -10000000, max: 10000000 }), (a) => {
          expect(a + -a).toBe(0);
          expect(-a + a).toBe(0);
        })
      );
    });
  });

  describe("multiplication for percentage calculations", () => {
    test("multiplying by percentage and dividing back is approximate (due to rounding)", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 10000000 }), // Use larger amounts to minimize rounding impact
          fc.integer({ min: 10, max: 100 }), // Avoid very small percentages
          (amount, percentage) => {
            const scaled = Math.round((amount * percentage) / 100);
            const original = Math.round((scaled * 100) / percentage);

            // Division/multiplication round-trip will have rounding errors
            // This is expected behavior, not a bug
            const tolerance = Math.max(10, Math.ceil(amount * 0.02)); // 2% tolerance for rounding
            expect(Math.abs(original - amount)).toBeLessThanOrEqual(tolerance);
          }
        )
      );
    });

    test("percentage of total always less than or equal to total for positive amounts", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000000 }),
          fc.integer({ min: 1, max: 100 }),
          (amount, percentage) => {
            const part = Math.round((amount * percentage) / 100);

            expect(part).toBeLessThanOrEqual(amount);
          }
        )
      );
    });
  });

  describe("comparison operations", () => {
    test("comparison is transitive", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10000000, max: 10000000 }),
          fc.integer({ min: -10000000, max: 10000000 }),
          fc.integer({ min: -10000000, max: 10000000 }),
          (a, b, c) => {
            if (a <= b && b <= c) {
              expect(a <= c).toBe(true);
            }
          }
        )
      );
    });

    test("comparison is antisymmetric", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10000000, max: 10000000 }),
          fc.integer({ min: -10000000, max: 10000000 }),
          (a, b) => {
            if (a <= b && b <= a) {
              expect(a).toBe(b);
            }
          }
        )
      );
    });

    test("negative amounts are always less than positive amounts", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10000000, max: -1 }),
          fc.integer({ min: 1, max: 10000000 }),
          (negative, positive) => {
            expect(negative).toBeLessThan(positive);
          }
        )
      );
    });

    test("absolute value is always non-negative", () => {
      fc.assert(
        fc.property(fc.integer({ min: -10000000, max: 10000000 }), (amount) => {
          expect(Math.abs(amount)).toBeGreaterThanOrEqual(0);
        })
      );
    });
  });

  describe("aggregation invariants", () => {
    test("sum of positive amounts is positive", () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 1000000 }), { minLength: 1, maxLength: 100 }),
          (amounts) => {
            const sum = amounts.reduce((acc, val) => acc + val, 0);

            expect(sum).toBeGreaterThan(0);
          }
        )
      );
    });

    test("sum of negative amounts is negative", () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: -1000000, max: -1 }), { minLength: 1, maxLength: 100 }),
          (amounts) => {
            const sum = amounts.reduce((acc, val) => acc + val, 0);

            expect(sum).toBeLessThan(0);
          }
        )
      );
    });

    test("sum order does not matter (commutativity)", () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: -1000000, max: 1000000 }), { minLength: 1, maxLength: 50 }),
          (amounts) => {
            const sum1 = amounts.reduce((acc, val) => acc + val, 0);
            const sum2 = [...amounts].reverse().reduce((acc, val) => acc + val, 0);

            expect(sum1).toBe(sum2);
          }
        )
      );
    });

    test("splitting and rejoining preserves total", () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: -1000000, max: 1000000 }), { minLength: 2, maxLength: 50 }),
          (amounts) => {
            const total = amounts.reduce((acc, val) => acc + val, 0);

            const mid = Math.floor(amounts.length / 2);
            const part1 = amounts.slice(0, mid).reduce((acc, val) => acc + val, 0);
            const part2 = amounts.slice(mid).reduce((acc, val) => acc + val, 0);

            expect(part1 + part2).toBe(total);
          }
        )
      );
    });

    test("average is between min and max for non-empty arrays", () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: -1000000, max: 1000000 }), { minLength: 1, maxLength: 100 }),
          (amounts) => {
            const sum = amounts.reduce((acc, val) => acc + val, 0);
            const avg = Math.round(sum / amounts.length);
            const min = Math.min(...amounts);
            const max = Math.max(...amounts);

            expect(avg).toBeGreaterThanOrEqual(min);
            expect(avg).toBeLessThanOrEqual(max);
          }
        )
      );
    });
  });

  describe("clearing account invariants (zero-sum)", () => {
    test("payout and corresponding fee sum to zero", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10000000 }), (payoutAmount) => {
          // Payout is positive, fee is negative
          const fee = -payoutAmount;

          expect(payoutAmount + fee).toBe(0);
        })
      );
    });

    test("clearing account transactions sum to zero or near zero", () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 1000000 }), { minLength: 2, maxLength: 20 }),
          (transactions) => {
            // Create matching pairs: for each amount, create positive and negative
            const paired: number[] = [];
            for (const amt of transactions) {
              paired.push(amt);
              paired.push(-amt);
            }

            const total = paired.reduce((acc, val) => acc + val, 0);

            // Should be exactly zero for paired transactions
            expect(total).toBe(0);
          }
        )
      );
    });
  });

  describe("sign preservation", () => {
    test("negating twice returns original value", () => {
      fc.assert(
        fc.property(fc.integer({ min: -10000000, max: 10000000 }), (amount) => {
          expect(-(-amount)).toBe(amount);
        })
      );
    });

    test("absolute value of negation equals absolute value of original", () => {
      fc.assert(
        fc.property(fc.integer({ min: -10000000, max: 10000000 }), (amount) => {
          expect(Math.abs(-amount)).toBe(Math.abs(amount));
        })
      );
    });

    test("multiplying by -1 is equivalent to negation", () => {
      fc.assert(
        fc.property(fc.integer({ min: -10000000, max: 10000000 }), (amount) => {
          expect(amount * -1).toBe(-amount);
        })
      );
    });
  });

  describe("precision and rounding", () => {
    test("rounding to integer preserves integer cents", () => {
      fc.assert(
        fc.property(fc.integer({ min: -10000000, max: 10000000 }), (cents) => {
          expect(Math.round(cents)).toBe(cents);
        })
      );
    });

    test("float precision errors do not occur with integer cents", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 10000 }),
          (a, b) => {
            // No precision loss with integer arithmetic
            expect(a + b - b).toBe(a);
            expect(b + a - a).toBe(b);
          }
        )
      );
    });
  });
});
