import { test, expect, type Page } from '@playwright/test';

// Skip in production
test.skip(process.env.NODE_ENV === 'production', 'Categorizer lab should not be available in production');

test.describe('Categorizer Lab', () => {
  test.beforeEach(async ({ page }) => {
    // Enable the lab feature flag for testing
    await page.addInitScript(() => {
      localStorage.setItem('CATEGORIZER_LAB_ENABLED', 'true');
    });
  });

  test('should load the lab page when feature flag is enabled', async ({ page }) => {
    await page.goto('/categorizer-lab');
    
    // Should not redirect to 404
    await expect(page).toHaveURL('/categorizer-lab');
    
    // Should show lab title and warning
    await expect(page.locator('h1')).toContainText('Categorization Lab');
    await expect(page.locator('text=Development Tool')).toBeVisible();
    
    // Should show dataset section
    await expect(page.locator('h2:has-text("1. Dataset")')).toBeVisible();
  });

  test('should show categorizer lab when enabled', async ({ page }) => {
    // In development mode, the lab should be enabled by default
    await page.goto('/categorizer-lab');
    
    // Should show the categorizer lab page
    await expect(page.locator('h1')).toContainText('Categorization Lab');
    await expect(page.locator('text=Development Tool')).toBeVisible();
  });

  test('should generate and process synthetic data', async ({ page }) => {
    await page.goto('/categorizer-lab');
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Categorization Lab');
    
    // Generate synthetic data (should be the default option)
    await expect(page.locator('select').first()).toHaveValue('synthetic');
    
    // Set a small count for faster testing
    await page.fill('input[id="count"]', '5');
    
    // Click generate button
    await page.click('button:has-text("Generate Synthetic Data")');
    
    // Should show configuration section after dataset is loaded
    await expect(page.locator('h2:has-text("2. Configuration")')).toBeVisible();
    
    // Should show transaction count in the estimates
    await expect(page.locator('text=5').first()).toBeVisible();
    
    // Configure to use Pass-1 only for faster testing
    await page.selectOption('select[id="engine-mode"]', 'pass1');
    
    // Run categorization
    await page.click('button:has-text("Run Categorization")');
    
    // Should show progress section
    await expect(page.locator('h2:has-text("3. Progress")')).toBeVisible();
    await expect(page.locator('text=Categorization in Progress')).toBeVisible();
    
    // Wait for completion (Pass-1 should be fast)
    await expect(page.locator('h2:has-text("Categorization Complete")')).toBeVisible({ timeout: 30000 });
    
    // Should show results section
    await expect(page.locator('h2:has-text("4. Results")')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    
    // Should show metrics section
    await expect(page.locator('h2:has-text("5. Metrics")')).toBeVisible();
    await expect(page.locator('text=Total Transactions')).toBeVisible();
    
    // Should show visualizations section
    await expect(page.locator('h2:has-text("6. Visualizations")')).toBeVisible();
    await expect(page.locator('text=Confidence Distribution')).toBeVisible();
    
    // Should show export section
    await expect(page.locator('h2:has-text("7. Export")')).toBeVisible();
    await expect(page.locator('button:has-text("Export as JSON")')).toBeEnabled();
    await expect(page.locator('button:has-text("Export as CSV")')).toBeEnabled();
  });

  test('should load test scenarios', async ({ page }) => {
    await page.goto('/categorizer-lab');
    
    // Select scenario mode
    await page.selectOption('select[id="upload-method"]', 'scenario');
    
    // Load clear cases scenario
    await page.click('button:has-text("Clear Cases")');
    
    // Should show configuration section
    await expect(page.locator('h2:has-text("2. Configuration")')).toBeVisible();
    
    // Should show 2 transactions
    await expect(page.locator('text=2 transactions')).toBeVisible();
    
    // Run categorization with Pass-1
    await page.selectOption('select[id="engine-mode"]', 'pass1');
    await page.click('button:has-text("Run Categorization")');
    
    // Wait for completion
    await expect(page.locator('h2:has-text("Categorization Complete")')).toBeVisible({ timeout: 15000 });
    
    // Check results table shows 2 rows
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows).toHaveCount(2);
  });

  test('should handle file upload', async ({ page }) => {
    await page.goto('/categorizer-lab');
    
    // Select file upload mode
    await page.selectOption('select[id="upload-method"]', 'file');
    
    // Create a simple test CSV content
    const csvContent = `id,description,amount_cents,category_id
test-1,STARBUCKS COFFEE,-500,meals
test-2,ELECTRIC BILL,-15000,utilities`;
    
    // Create a file and upload it
    const fileBuffer = Buffer.from(csvContent, 'utf-8');
    
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'test-transactions.csv',
      mimeType: 'text/csv',
      buffer: fileBuffer,
    });
    
    // Should show configuration section
    await expect(page.locator('h2:has-text("2. Configuration")')).toBeVisible();
    
    // Should show correct transaction count
    await expect(page.locator('text=2 transactions')).toBeVisible();
  });

  test('should handle paste data', async ({ page }) => {
    await page.goto('/categorizer-lab');
    
    // Select paste mode
    await page.selectOption('select[id="upload-method"]', 'paste');
    
    // Select JSON format
    await page.selectOption('select[id="data-format"]', 'json');
    
    // Paste JSON data
    const jsonData = JSON.stringify([
      {
        id: 'paste-1',
        description: 'COFFEE SHOP',
        amountCents: '-350',
        categoryId: 'meals'
      }
    ]);
    
    await page.fill('textarea[id="pasted-data"]', jsonData);
    await page.click('button:has-text("Load Data")');
    
    // Should show configuration section
    await expect(page.locator('h2:has-text("2. Configuration")')).toBeVisible();
    
    // Should show 1 transaction
    await expect(page.locator('text=1 transactions')).toBeVisible();
  });

  test('should filter and sort results table', async ({ page }) => {
    await page.goto('/categorizer-lab');
    
    // Generate some synthetic data
    await page.fill('input[id="count"]', '10');
    await page.click('button:has-text("Generate Synthetic Data")');
    
    // Run categorization
    await page.selectOption('select[id="engine-mode"]', 'pass1');
    await page.click('button:has-text("Run Categorization")');
    
    // Wait for completion
    await expect(page.locator('h2:has-text("Categorization Complete")')).toBeVisible({ timeout: 30000 });
    
    // Test search filter
    await page.fill('input[placeholder="Search transactions..."]', 'synthetic-1');
    
    // Should filter the table
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows).toHaveCount(1);
    
    // Clear search
    await page.fill('input[placeholder="Search transactions..."]', '');
    await expect(tableRows).toHaveCount(10);
    
    // Test engine filter
    await page.selectOption('select >> nth=1', 'pass1'); // Second select is the engine filter
    await expect(tableRows).toHaveCount(10); // All should be Pass-1
    
    // Test status filter
    await page.selectOption('select >> nth=2', 'success'); // Third select is status filter
    // Should still show results (assuming no errors)
  });

  test('should export results', async ({ page }) => {
    await page.goto('/categorizer-lab');
    
    // Generate minimal data for export test
    await page.fill('input[id="count"]', '3');
    await page.click('button:has-text("Generate Synthetic Data")');
    
    // Run categorization
    await page.selectOption('select[id="engine-mode"]', 'pass1');
    await page.click('button:has-text("Run Categorization")');
    
    // Wait for completion
    await expect(page.locator('h2:has-text("Categorization Complete")')).toBeVisible({ timeout: 20000 });
    
    // Test export buttons are enabled
    await expect(page.locator('button:has-text("Export as JSON")')).toBeEnabled();
    await expect(page.locator('button:has-text("Export as CSV")')).toBeEnabled();
    await expect(page.locator('button:has-text("Export Metrics CSV")')).toBeEnabled();
    
    // Click export JSON (we can't actually test the download in Playwright easily)
    await page.click('button:has-text("Export as JSON")');
    
    // Click export CSV
    await page.click('button:has-text("Export as CSV")');
    
    // Click export metrics
    await page.click('button:has-text("Export Metrics CSV")');
  });

  test('should show metrics and visualizations', async ({ page }) => {
    await page.goto('/categorizer-lab');
    
    // Generate data with ground truth for accuracy metrics
    await page.fill('input[id="count"]', '5');
    await page.click('button:has-text("Generate Synthetic Data")');
    
    // Run categorization
    await page.selectOption('select[id="engine-mode"]', 'pass1');
    await page.click('button:has-text("Run Categorization")');
    
    // Wait for completion
    await expect(page.locator('h2:has-text("Categorization Complete")')).toBeVisible({ timeout: 20000 });
    
    // Check metrics cards are visible
    await expect(page.locator('text=Total Transactions')).toBeVisible();
    await expect(page.locator('text=Successful')).toBeVisible();
    
    // Check performance metrics
    await expect(page.locator('text=Mean Latency')).toBeVisible();
    await expect(page.locator('text=P50 Latency')).toBeVisible();
    
    // Check confidence distribution
    await expect(page.locator('text=Confidence Distribution')).toBeVisible();
    await expect(page.locator('text=Mean Confidence')).toBeVisible();
    
    // Check accuracy metrics (should be available with synthetic data)
    await expect(page.locator('text=Accuracy Analysis')).toBeVisible();
    await expect(page.locator('text=Overall Accuracy')).toBeVisible();
    
    // Check visualizations
    await expect(page.locator('text=Engine Usage')).toBeVisible();
    await expect(page.locator('text=Latency Analysis')).toBeVisible();
  });

  test('should handle configuration changes', async ({ page }) => {
    await page.goto('/categorizer-lab');
    
    // Generate data
    await page.fill('input[id="count"]', '5');
    await page.click('button:has-text("Generate Synthetic Data")');
    
    // Test engine mode changes
    await page.selectOption('select[id="engine-mode"]', 'hybrid');
    await expect(page.locator('text=Hybrid Threshold')).toBeVisible();
    
    // Test batch size
    await page.fill('input[id="batch-size"]', '5');
    
    // Test concurrency
    await page.fill('input[id="concurrency"]', '2');
    
    // Check estimates update
    await expect(page.locator('text=5').first()).toBeVisible(); // Transaction count
    
    // Change back to Pass-1 only
    await page.selectOption('select[id="engine-mode"]', 'pass1');
    await expect(page.locator('text=Hybrid Threshold')).not.toBeVisible();
    
    // Run with Pass-1
    await page.click('button:has-text("Run Categorization")');
    await expect(page.locator('h2:has-text("Categorization Complete")')).toBeVisible({ timeout: 20000 });
  });
});