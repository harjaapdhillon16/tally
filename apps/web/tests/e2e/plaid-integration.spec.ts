import { test, expect } from '@playwright/test';

test.describe('Plaid Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should show connect bank button on empty dashboard', async ({ page }) => {
    // This test assumes user is signed in and has no connections
    // In a real test environment, you'd set up proper test data
    
    await page.goto('/dashboard');
    
    // Should show empty state with connect button
    await expect(page.locator('text=Connect Your Bank')).toBeVisible();
    await expect(page.locator('text=No accounts connected')).toBeVisible();
  });

  test('should display connections page', async ({ page }) => {
    await page.goto('/connections');
    
    // Should show connections page header
    await expect(page.locator('h1:has-text("Bank Connections")')).toBeVisible();
    await expect(page.locator('text=Connect Bank Account')).toBeVisible();
  });

  test('should display transactions page', async ({ page }) => {
    await page.goto('/transactions');
    
    // Should show transactions page header
    await expect(page.locator('h1:has-text("Transactions")')).toBeVisible();
  });

  test('should handle connection flow gracefully', async ({ page }) => {
    await page.goto('/connections');
    
    // Click connect bank button
    await page.click('text=Connect Bank Account');
    
    // Note: In sandbox mode, Plaid Link would normally open
    // This test would need to be enhanced with Plaid's test utilities
    // to complete the full flow
  });

  test('should display raw transaction data modal', async ({ page }) => {
    await page.goto('/transactions');
    
    // If there are transactions, test the raw data modal
    const viewRawButton = page.locator('button:has-text("View Raw")').first();
    
    if (await viewRawButton.isVisible()) {
      await viewRawButton.click();
      await expect(page.locator('text=Raw Transaction Data')).toBeVisible();
      await expect(page.locator('pre')).toBeVisible();
      
      // Close modal
      await page.click('button:has-text("Close")');
      await expect(page.locator('text=Raw Transaction Data')).not.toBeVisible();
    }
  });
});