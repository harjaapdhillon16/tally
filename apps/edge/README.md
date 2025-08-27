# Edge Functions Testing Guide

This directory contains Supabase Edge Functions for the Nexus platform, along with comprehensive testing infrastructure.

## Structure

```
apps/edge/
├── _shared/          # Shared utilities and services
│   ├── *.ts         # Utility modules
│   └── *.test.ts    # Tests for shared utilities
├── _test/           # Testing infrastructure
│   └── test-utils.ts # Testing utilities and mocks
├── plaid/           # Plaid integration functions
│   ├── exchange/
│   ├── sync-accounts/
│   ├── sync-transactions/
│   ├── backfill-transactions/
│   └── webhook/
├── jobs/            # Scheduled job functions
│   └── plaid-daily-sync/
├── supabase/        # Supabase configuration
│   └── config.toml  # Function configuration
├── deno.json        # Deno configuration and tasks
├── test.sh          # Test runner script
└── README.md        # This file
```

## Testing Infrastructure

### Framework
- **Deno Test**: Native Deno testing framework
- **Assertions**: Standard library assertions (`std/testing/asserts.ts`)
- **Mocking**: Custom mock utilities for external dependencies

### Test Utilities (`_test/test-utils.ts`)
- Environment setup and teardown
- Mock Supabase client
- Mock Plaid API responses
- Mock request/response helpers
- Authentication mocking

## Running Tests

### Prerequisites
- [Deno](https://deno.land/manual/getting_started/installation) installed
- Environment variables configured (see below)

### Commands

```bash
# Run all tests
./test.sh

# Run with coverage
./test.sh --coverage

# Run specific test file
deno test plaid/exchange/exchange.test.ts --allow-net --allow-env --allow-read

# Run tests with watch mode
deno test --allow-net --allow-env --allow-read --watch

# Run tests using deno tasks
deno task test
deno task test:watch
deno task test:coverage
```

## Environment Variables

Set up these environment variables for testing:

```bash
# Plaid Configuration (sandbox for testing)
PLAID_CLIENT_ID=test-client-id
PLAID_SECRET=test-secret
PLAID_ENV=sandbox

# Supabase Configuration
SUPABASE_URL=https://test.supabase.co
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key

# Security
ENCRYPTION_KEY=test-encryption-key-32-chars-long
```

**Note**: Test utilities automatically set up mock environment variables, so these are only needed for integration testing.

## Test Coverage

### Current Test Files
- `plaid/exchange/exchange.test.ts` - Token exchange function tests
- `plaid/sync-accounts/sync-accounts.test.ts` - Account sync tests
- `plaid/webhook/webhook.test.ts` - Webhook handler tests
- `_shared/with-org.test.ts` - Organization authentication tests

### Test Scenarios Covered
- ✅ Valid request handling
- ✅ Authentication and authorization
- ✅ Error handling (invalid input, missing data)
- ✅ HTTP method validation
- ✅ JSON parsing errors
- ✅ External API integration (mocked)
- ✅ Database operations (mocked)

## Writing New Tests

### Test File Structure
```typescript
import { assertEquals } from "../../_test/test-utils.ts";
import {
  setupTestEnv,
  cleanupTestEnv,
  createMockRequest,
  // ... other utilities
} from "../../_test/test-utils.ts";

Deno.test({
  name: "function setup",
  fn: () => {
    setupTestEnv();
  }
});

Deno.test({
  name: "should handle valid request",
  async fn() {
    // Your test logic here
  }
});

Deno.test({
  name: "function cleanup", 
  fn: () => {
    cleanupTestEnv();
  }
});
```

### Best Practices
1. **Setup and Cleanup**: Always include setup and cleanup tests
2. **Descriptive Names**: Use clear, descriptive test names
3. **Mock External Dependencies**: Use provided mock utilities
4. **Test Error Cases**: Include negative test cases
5. **Isolated Tests**: Each test should be independent

## Mocking Strategy

### External APIs
- **Plaid API**: Mocked with realistic response structures
- **Supabase**: Mocked client with standard CRUD operations
- **Fetch**: Global fetch function mocked for external calls

### Authentication
- **JWT**: Pre-generated mock JWT tokens
- **User Context**: Mock user and organization data
- **Service Role**: Mock service role authentication

## Integration with CI/CD

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run Edge Function Tests
  run: |
    cd apps/edge
    deno test --allow-net --allow-env --allow-read
```

## Deployment Testing

Before deploying to production:

1. **Run Full Test Suite**: `./test.sh`
2. **Fix the Deployment Structure**: Resolve the Supabase CLI deployment issue
3. **Test Locally**: Use `supabase functions serve` for local testing
4. **Deploy to Staging**: Test in staging environment first

## Troubleshooting

### Common Issues

**Permission Errors**
```bash
# Make sure test script is executable
chmod +x test.sh
```

**Deno Import Errors**
```bash
# Clear Deno cache if needed
deno cache --reload _test/test-utils.ts
```

**Environment Variable Issues**
- Check that all required environment variables are set
- Verify `deno.json` configuration is correct

### Debug Mode
```bash
# Run tests with debug output
deno test --allow-net --allow-env --allow-read --log-level=debug
```

## Next Steps

1. **Complete Deployment Setup**: Fix the Supabase CLI structure issue
2. **Add Integration Tests**: Test with real Supabase instance
3. **Performance Testing**: Add performance benchmarks
4. **End-to-End Testing**: Connect with frontend E2E tests

For questions or issues, refer to the main project documentation or create an issue in the repository.
