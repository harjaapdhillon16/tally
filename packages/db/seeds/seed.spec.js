import { describe, expect, test } from "vitest";
// Re-export helper functions from seed.ts for testing
// Note: In a real implementation, these would be extracted to a separate module
function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function generateAmount(type, category) {
    if (type === "revenue") {
        // Revenue amounts (positive)
        if (category.includes("Gift Card"))
            return Math.floor(Math.random() * (15000 - 2500 + 1)) + 2500;
        if (category.includes("Product"))
            return Math.floor(Math.random() * (8000 - 1500 + 1)) + 1500;
        if (category.includes("Massage"))
            return Math.floor(Math.random() * (12000 - 6000 + 1)) + 6000;
        if (category.includes("Hair"))
            return Math.floor(Math.random() * (20000 - 3500 + 1)) + 3500;
        if (category.includes("Nail"))
            return Math.floor(Math.random() * (8000 - 2500 + 1)) + 2500;
        return Math.floor(Math.random() * (15000 - 2000 + 1)) + 2000;
    }
    else {
        // Expense amounts (negative)
        if (category.includes("Rent"))
            return -(Math.floor(Math.random() * (800000 - 250000 + 1)) + 250000);
        if (category.includes("Utilities"))
            return -(Math.floor(Math.random() * (60000 - 15000 + 1)) + 15000);
        if (category.includes("Supplies"))
            return -(Math.floor(Math.random() * (50000 - 5000 + 1)) + 5000);
        if (category.includes("Equipment"))
            return -(Math.floor(Math.random() * (200000 - 20000 + 1)) + 20000);
        if (category.includes("Staff"))
            return -(Math.floor(Math.random() * (500000 - 150000 + 1)) + 150000);
        if (category.includes("Software"))
            return -(Math.floor(Math.random() * (19900 - 2900 + 1)) + 2900);
        if (category.includes("Marketing"))
            return -(Math.floor(Math.random() * (100000 - 10000 + 1)) + 10000);
        if (category.includes("Insurance"))
            return -(Math.floor(Math.random() * (80000 - 20000 + 1)) + 20000);
        if (category.includes("Bank Fees"))
            return -(Math.floor(Math.random() * (2995 - 295 + 1)) + 295);
        return -(Math.floor(Math.random() * (50000 - 2500 + 1)) + 2500);
    }
}
function generateRawPayload(description, amountCents, merchantName) {
    return {
        source: "manual",
        original_description: description,
        amount: amountCents / 100,
        currency: "USD",
        merchant: {
            name: merchantName,
            category: amountCents > 0 ? "beauty_salon" : "business_expense",
        },
        metadata: {
            entry_method: "manual",
            created_by: "seed_script",
            confidence: 0.85,
        },
    };
}
describe("getRandomElement", () => {
    test("returns element from array", () => {
        const testArray = ["a", "b", "c"];
        const result = getRandomElement(testArray);
        expect(testArray).toContain(result);
    });
    test("returns single element from single-item array", () => {
        const testArray = ["single"];
        const result = getRandomElement(testArray);
        expect(result).toBe("single");
    });
});
describe("generateAmount", () => {
    test("generates positive revenue amounts for Hair services", () => {
        const amount = generateAmount("revenue", "Hair Cut Service");
        expect(amount).toBeGreaterThan(0);
        expect(amount).toBeGreaterThanOrEqual(3500);
        expect(amount).toBeLessThanOrEqual(20000);
    });
    test("generates negative expense amounts for Rent", () => {
        const amount = generateAmount("expense", "Rent & Utilities");
        expect(amount).toBeLessThan(0);
        expect(amount).toBeLessThanOrEqual(-250000);
        expect(amount).toBeGreaterThanOrEqual(-800000);
    });
    test("generates positive amounts for Gift Card sales", () => {
        const amount = generateAmount("revenue", "Gift Card Sale");
        expect(amount).toBeGreaterThan(0);
        expect(amount).toBeGreaterThanOrEqual(2500);
        expect(amount).toBeLessThanOrEqual(15000);
    });
    test("generates negative amounts for Software expenses", () => {
        const amount = generateAmount("expense", "Software & Technology");
        expect(amount).toBeLessThan(0);
        expect(amount).toBeLessThanOrEqual(-2900);
        expect(amount).toBeGreaterThanOrEqual(-19900);
    });
});
describe("generateRawPayload", () => {
    test("creates proper raw payload structure for revenue transaction", () => {
        const description = "Hair Cut & Style";
        const amountCents = 5000;
        const merchantName = "Glow Salon";
        const payload = generateRawPayload(description, amountCents, merchantName);
        expect(payload).toEqual({
            source: "manual",
            original_description: description,
            amount: 50.0,
            currency: "USD",
            merchant: {
                name: merchantName,
                category: "beauty_salon",
            },
            metadata: {
                entry_method: "manual",
                created_by: "seed_script",
                confidence: 0.85,
            },
        });
    });
    test("creates proper raw payload structure for expense transaction", () => {
        const description = "Rent Payment";
        const amountCents = -300000;
        const merchantName = "Metro Property Management";
        const payload = generateRawPayload(description, amountCents, merchantName);
        expect(payload).toEqual({
            source: "manual",
            original_description: description,
            amount: -3000.0,
            currency: "USD",
            merchant: {
                name: merchantName,
                category: "business_expense",
            },
            metadata: {
                entry_method: "manual",
                created_by: "seed_script",
                confidence: 0.85,
            },
        });
    });
    test("correctly converts cents to dollars", () => {
        const payload = generateRawPayload("Test", 12345, "Test Merchant");
        expect(payload.amount).toBe(123.45);
    });
});
//# sourceMappingURL=seed.spec.js.map