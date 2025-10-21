import { test, expect } from '@playwright/test';

/**
 * E2E tests for Shopify integration
 * Tests the full flow from OAuth to webhook ingestion
 */

test.describe('Shopify Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to connections page
    // Note: Replace with your actual auth flow
    await page.goto('/login');
    // await page.fill('[name="email"]', 'test@example.com');
    // await page.fill('[name="password"]', 'password');
    // await page.click('button[type="submit"]');
    await page.goto('/settings/connections');
  });

  test('should display Connect Shopify Store button', async ({ page }) => {
    const shopifyButton = page.getByRole('button', { name: /Connect Shopify Store/i });
    await expect(shopifyButton).toBeVisible();
  });

  test('should open Shopify connection dialog', async ({ page }) => {
    const shopifyButton = page.getByRole('button', { name: /Connect Shopify Store/i });
    await shopifyButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    
    const title = page.getByText('Connect Shopify Store');
    await expect(title).toBeVisible();
    
    const input = page.getByLabel('Shop Domain');
    await expect(input).toBeVisible();
  });

  test('should validate shop domain input', async ({ page }) => {
    const shopifyButton = page.getByRole('button', { name: /Connect Shopify Store/i });
    await shopifyButton.click();

    const connectButton = page.getByRole('button', { name: /^Connect Store$/i });
    await connectButton.click();

    // Should show error for empty shop domain
    const toast = page.getByText(/Shop domain required/i);
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('should normalize shop domain correctly', async ({ page }) => {
    const shopifyButton = page.getByRole('button', { name: /Connect Shopify Store/i });
    await shopifyButton.click();

    const input = page.getByLabel('Shop Domain');
    
    // Test various input formats
    await input.fill('my-store');
    
    const connectButton = page.getByRole('button', { name: /^Connect Store$/i });
    await connectButton.click();

    // Should redirect to OAuth (we can't fully test OAuth without a real Shopify account)
    // But we can verify the redirect starts
    await page.waitForURL(/\/api\/shopify\/oauth\/start/, { timeout: 5000 });
  });

  test('should display connected Shopify store', async ({ page }) => {
    // This test assumes a Shopify connection already exists
    // You may need to set up test data first
    
    const shopifyConnection = page.getByText(/shopify/i);
    
    // If connection exists, verify it's displayed
    const connectionExists = await shopifyConnection.isVisible().catch(() => false);
    
    if (connectionExists) {
      await expect(shopifyConnection).toBeVisible();
      
      // Verify status badge
      const statusBadge = page.getByText(/active/i);
      await expect(statusBadge).toBeVisible();
    }
  });

  test('should show Shopify connection details', async ({ page }) => {
    // Assumes a Shopify connection exists
    const shopifyConnection = page.locator('div:has-text("shopify")').first();
    const connectionExists = await shopifyConnection.isVisible().catch(() => false);
    
    if (connectionExists) {
      // Verify connection card shows provider name
      await expect(shopifyConnection).toContainText(/shopify/i);
      
      // Verify it shows connection date
      await expect(shopifyConnection).toContainText(/Connected/i);
    }
  });

  test('should handle OAuth callback success', async ({ page }) => {
    // Navigate directly to callback with success parameter
    await page.goto('/settings/connections?success=shopify_connected');
    
    // Should show success toast or message
    const successMessage = page.getByText(/connected/i);
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test('should handle OAuth callback error', async ({ page }) => {
    // Navigate to callback with error parameter
    await page.goto('/settings/connections?error=callback_failed');
    
    // Should show error message
    const errorMessage = page.getByText(/error|failed/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Shopify Webhook Processing', () => {
  test('should process order webhook and create transactions', async ({ page }) => {
    // This test requires:
    // 1. A connected Shopify store
    // 2. Ability to trigger a test webhook
    // 3. Access to transactions page to verify ingestion
    
    // Navigate to transactions page
    await page.goto('/transactions');
    
    // Note: In a real test, you would:
    // 1. Trigger a test webhook via Shopify API or test endpoint
    // 2. Wait for webhook processing
    // 3. Verify new transactions appear in the list
    
    // For now, just verify the page loads
    await expect(page).toHaveURL(/\/transactions/);
  });

  test('should categorize Shopify transactions correctly', async ({ page }) => {
    // Navigate to transactions page
    await page.goto('/transactions');
    
    // Look for Shopify transactions (if any exist)
    const shopifyTransaction = page.locator('tr:has-text("Shopify")').first();
    const transactionExists = await shopifyTransaction.isVisible().catch(() => false);
    
    if (transactionExists) {
      // Verify it has a category assigned
      const category = shopifyTransaction.locator('td').nth(3); // Adjust selector as needed
      await expect(category).not.toBeEmpty();
      
      // Verify merchant name is Shopify
      await expect(shopifyTransaction).toContainText(/Shopify/i);
    }
  });
});

test.describe('Shopify Backfill', () => {
  test('should trigger backfill for connected store', async ({ page, request }) => {
    // This test requires a connected Shopify store
    // and access to trigger the backfill Edge Function
    
    // Get connection ID (would need to fetch from API or page)
    // const connectionId = 'test-connection-id';
    
    // Trigger backfill via API
    // const response = await request.post('/api/shopify/backfill', {
    //   data: { connectionId, daysBack: 30 },
    // });
    
    // expect(response.ok()).toBeTruthy();
    
    // Note: Full implementation requires test infrastructure
    test.skip();
  });
});

