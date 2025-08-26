import { defineConfig, devices } from "@playwright/test";
import * as path from "path";
import * as dotenv from "dotenv";
// Load environment variables from the project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
export default defineConfig({
    testDir: "./tests/e2e",
    retries: 2,
    reporter: "line",
    use: {
        baseURL: process.env.BASE_URL || "http://localhost:3000",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },
        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
        },
    ],
    webServer: {
        command: "pnpm run dev",
        url: process.env.BASE_URL || "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        env: {
            // Pass through environment variables to the dev server
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
    },
});
//# sourceMappingURL=playwright.config.js.map