import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'e2e',
    include: ['tests/e2e/**/*.spec.ts'],
    testTimeout: 30000, // 30 seconds for API calls
    setupFiles: ['tests/e2e/setup.ts'],
    env: {
      NODE_ENV: 'test'
    }
  }
});