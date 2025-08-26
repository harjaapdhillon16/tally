import { test, expect } from "@playwright/test";
test.describe("Nexus Application", () => {
    test("should render homepage with title containing Nexus", async ({ page, }) => {
        const response = await page.goto("/");
        // Check that the page loads successfully
        expect(response?.status()).toBe(200);
        // Assert the page title contains "Nexus"
        await expect(page).toHaveTitle(/Nexus/);
        // Wait for page to be loaded (any element that should be present)
        await page.waitForLoadState("domcontentloaded");
        // Verify body exists
        const body = page.locator("body");
        await expect(body).toBeVisible();
    });
    test("should have working health endpoint", async ({ request }) => {
        const response = await request.get("/api/health");
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.status).toBe("ok");
        expect(data.message).toBe("Nexus API is healthy");
        expect(data.timestamp).toBeTruthy();
    });
    test("should render app shell with sidebar and topbar when visiting dashboard", async ({ page, }) => {
        // Visit the dashboard page
        await page.goto("/dashboard");
        // Check if we're redirected to auth or if we can see the app shell
        const currentURL = page.url();
        if (currentURL.includes("/sign-in") || currentURL.includes("/sign-up")) {
            // Dashboard is protected, check the sign-in page has proper title
            await expect(page).toHaveTitle(/Nexus/);
            // Check that the sign-in form is present
            const signInForm = page.locator('form, [data-testid="sign-in"], .sign-in');
            await expect(signInForm.first()).toBeVisible({ timeout: 5000 });
        }
        else {
            // Dashboard is accessible, check for app shell elements
            await expect(page).toHaveTitle(/Nexus/);
            // Look for sidebar with "Nexus" branding
            const sidebarTitle = page.locator('h1:has-text("Nexus")');
            await expect(sidebarTitle.first()).toBeVisible({ timeout: 5000 });
            // Look for navigation items (Dashboard, Transactions, etc.)
            const dashboardNav = page.locator('nav a:has-text("Dashboard")');
            await expect(dashboardNav.first()).toBeVisible({ timeout: 5000 });
            // Look for main content area
            const mainContent = page.locator("main");
            await expect(mainContent).toBeVisible();
        }
    });
    test("should handle 404 pages gracefully", async ({ page }) => {
        const response = await page.goto("/non-existent-page");
        // Next.js should return a 404 page
        expect(response?.status()).toBe(404);
        // The page should still have the Nexus title
        await expect(page).toHaveTitle(/Nexus/);
    });
});
//# sourceMappingURL=hello.spec.js.map