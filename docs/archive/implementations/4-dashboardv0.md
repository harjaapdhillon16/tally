# Dashboard v0 Implementation Documentation

## Overview

The Dashboard v0 feature provides a comprehensive financial overview for SMB users, displaying key metrics including cash on hand, safe-to-spend calculations, inflow/outflow analytics, expense categorization, and intelligent alerts. This implementation delivers real-time financial insights with live data integration and responsive user interactions.

## Feature Summary

### Core Metrics
- **Cash on Hand**: Real-time aggregate of liquid account balances
- **Safe-to-Spend (14d)**: Predictive cash flow calculation for next 14 days
- **Inflow/Outflow Analytics**: 30-day and 90-day transaction summaries with daily averages
- **Top Expense Categories**: 30-day categorized spending breakdown (top 5)
- **Spending Trend Analysis**: Month-over-month spending comparison with percentage delta
- **Intelligent Alerts**: Low balance warnings, unusual spending detection, and review reminders

## Architecture Overview

### Data Flow
1. **Account Balances**: Plaid API → Edge Functions → Supabase accounts table → Dashboard API
2. **Transaction Data**: Plaid/Square → Ingestion Service → Categorization → Dashboard aggregation
3. **Real-time Updates**: Transaction corrections → Query invalidation → Dashboard refresh
4. **Analytics**: User interactions → PostHog events → Usage insights

### Technology Stack
- **Backend**: Next.js API routes with Supabase PostgREST
- **Frontend**: React with TanStack Query for state management
- **Charts**: Recharts library for data visualization
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Analytics**: PostHog integration via `@nexus/analytics`
- **Caching**: HTTP cache headers + React Query client-side caching

## Implementation Details

### API Surface

#### Dashboard Endpoint
**Route**: `apps/web/src/app/api/dashboard/route.ts`

**Response Type**:
```typescript
type DashboardDTO = {
  cashOnHandCents: string;
  safeToSpend14Cents: string;
  inflowOutflow: {
    d30: { inflowCents: string; outflowCents: string; dailyAvgInflowCents: string; dailyAvgOutflowCents: string };
    d90: { inflowCents: string; outflowCents: string };
  };
  topExpenses30: Array<{ categoryId: string; name: string; cents: string }>;
  trend: { outflowDeltaPct: number };
  alerts: { lowBalance: boolean; unusualSpend: boolean; needsReviewCount: number };
  generatedAt: string;
};
```

**Key Features**:
- Organization-scoped queries using `withOrgFromRequest` helper
- Bigint arithmetic for precise financial calculations
- Cache headers: `s-maxage=30, stale-while-revalidate=120`
- Graceful error handling with sensible defaults

### Data Calculations

#### Cash on Hand
- Aggregates `current_balance_cents` from active liquid accounts
- Account types: checking, savings, cash
- Filters: `type in ('checking','savings','cash') AND is_active = true`

#### Safe-to-Spend (14-day projection)
Formula: `cashOnHand + 14*avgDailyInflow30 - 14*avgDailyOutflow30 - reservedFixed14`
- Uses 30-day daily averages for projection
- Reserved amounts (v0 = 0, extensible for recurring expenses)
- Handles negative projections gracefully

#### Inflow/Outflow Analytics
- **Convention**: Positive amounts = inflow, negative = outflow
- **Windows**: 30-day and 90-day periods
- **Daily Averages**: Computed for 30-day window only
- **Filtering**: Organization-scoped with date range bounds

#### Top Expense Categories
- Outflows only (negative amounts)
- Grouped by category_id with absolute value summation
- Joined with categories table for display names
- Handles uncategorized transactions
- Limited to top 5 by spending amount

#### Spending Trend Analysis
- Compares current 30-day period vs previous 30-day period
- Returns percentage delta: `((current - previous) / previous) * 100`
- Positive values indicate increased spending
- Zero handling for edge cases

#### Alert System
1. **Low Balance**: `cashOnHand < lowBalanceThreshold` (default: $1,000)
2. **Unusual Spending**: Z-score analysis of weekly spending patterns
   - Baseline: Previous 8-12 weeks (excluding current week)
   - Threshold: Statistical deviation detection
3. **Needs Review**: Count of transactions flagged for manual review

### Database Schema Changes

#### New Columns Added
```sql
-- Account balance tracking
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_balance_cents TEXT DEFAULT '0';

-- Organization-level thresholds
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS low_balance_threshold_cents TEXT DEFAULT '100000';
```

#### Indexing Strategy
- `idx_accounts_org_id`: Organization scoping
- `idx_transactions_date`: Time-range queries
- `idx_transactions_org_id`: Organization scoping
- Additional date indexes for performance optimization

### Frontend Implementation

#### Dashboard Page
**File**: `apps/web/src/app/(app)/dashboard/page.tsx`

**Components**:
1. **Header Cards**: Cash on Hand, Safe-to-Spend, Needs Review count
2. **Analytics Charts**: 
   - Bar chart: Inflow vs Outflow (30d/90d toggle)
   - Donut chart: Top 5 expense categories
   - Sparkline: Weekly spending trend with delta badge
3. **Alert Chips**: Interactive notifications with navigation

**Data Management**:
- TanStack Query integration with key `['dashboard', orgId]`
- 60-second stale time with automatic refetch
- Loading states and error boundaries
- Accessibility compliance (ARIA labels, focus management)

#### Real-time Updates
- Query invalidation after transaction corrections
- Automatic refresh on category changes
- Server-side revalidation hooks
- Optimistic UI updates where appropriate

### Plaid Integration Updates

#### Account Balance Sync
**Files Modified**:
- `apps/edge/_shared/account-service.ts`: Enhanced account transformation
- `apps/edge/jobs/plaid-daily-sync/index.ts`: Added account sync before transactions

**Changes**:
- `NormalizedAccount` interface extended with `current_balance_cents`
- Account balance extraction from Plaid `/accounts/get` endpoint
- Daily sync workflow updated to refresh balances before transactions
- Error handling for missing or invalid balance data

### Shared Utilities

#### Finance Helper Functions
**File**: `packages/shared/src/finance.ts`

**Functions**:
- `sumCents(strings: string[]): string` - Precise string-based addition
- `pctDelta(curr: number, prev: number): number` - Percentage change calculation
- `zScore(value: number, samples: number[]): number` - Statistical deviation analysis
- `toUSD(cents: string): string` - Currency formatting wrapper

**Design Principles**:
- Bigint arithmetic for financial precision
- String-based cent values at boundaries
- Zero-safe mathematical operations
- Comprehensive edge case handling

### Analytics Integration

#### PostHog Event Tracking
**Events Captured**:
- `dashboard_viewed`: Page load with organization context
- `dashboard_toggle_range`: Chart period switching (30d/90d)
- `dashboard_alert_clicked`: Alert interaction tracking
- `dashboard_chart_hover`: Chart interaction analytics (throttled)

**Implementation**:
- Client-side tracking via `@nexus/analytics/client`
- Organization-scoped event context
- Privacy-compliant data collection
- Performance-optimized event batching

### Performance Optimizations

#### Caching Strategy
1. **HTTP Level**: 30-second max-age with 120-second stale-while-revalidate
2. **Client Level**: React Query 60-second stale time
3. **Database Level**: Efficient query patterns with proper indexing
4. **CDN Level**: Static asset caching for chart components

#### Query Optimization
- Minimal field selection in database queries
- In-memory aggregation for complex calculations
- Prepared statement patterns for repeated queries
- Connection pooling via Supabase client

## Security Considerations

### Data Protection
- Row Level Security (RLS) enforcement for all queries
- Organization-scoped data access patterns
- Input validation via Zod schemas
- SQL injection prevention through parameterized queries

### Authentication & Authorization
- `withOrgFromRequest` helper for consistent auth checking
- Session-based organization context
- Role-based access control integration
- Audit logging for sensitive operations

## Testing Strategy

### Unit Tests
**Coverage**:
- `packages/shared/src/finance.spec.ts`: Mathematical utility functions
- Edge case validation for financial calculations
- Zero-division and overflow protection
- Currency formatting accuracy

### Integration Tests
**Coverage**:
- Dashboard API route response validation
- Database query correctness
- Organization scoping verification
- Cache behavior testing

### End-to-End Tests
**Coverage**:
- Complete dashboard rendering with live data
- Chart interactions and data updates
- Alert navigation workflows
- Re-categorization flow with dashboard refresh

## Configuration

### Environment Variables
- Supabase connection configuration (inherited)
- PostHog API keys via `@nexus/analytics`
- Cache TTL settings (configurable via environment)

### Feature Flags
- Dashboard v0 feature toggle capability
- Chart type experiments
- Alert threshold customization
- Analytics collection controls

## Known Limitations

### Version 0 Constraints
1. **Reserved Amounts**: Safe-to-spend calculation uses simplified model
2. **Historical Data**: Limited to available transaction history
3. **Category Intelligence**: Relies on existing categorization engine
4. **Mobile Optimization**: Desktop-first responsive design

### Performance Considerations
1. **Large Organizations**: May require pagination for high-transaction-volume accounts
2. **Real-time Updates**: 30-second cache may delay immediate updates
3. **Complex Queries**: Statistical calculations performed in-application vs database

## Future Enhancements

### Planned Improvements
1. **Advanced Safe-to-Spend**: Recurring expense detection and reservation
2. **Predictive Analytics**: Machine learning-based spending forecasts
3. **Custom Alerts**: User-defined threshold and notification preferences
4. **Export Capabilities**: Dashboard data export for external analysis
5. **Mobile App**: Native mobile dashboard implementation

### Technical Debt
1. **Query Optimization**: Consider materialized views for complex aggregations
2. **Caching Strategy**: Implement Redis for multi-instance cache consistency
3. **Real-time Updates**: WebSocket integration for immediate data sync
4. **Error Handling**: Enhanced error boundary and recovery mechanisms

## Dependencies

### Added Packages
- `recharts`: Chart visualization library
- Enhanced `@nexus/analytics` usage for dashboard events

### Version Requirements
- Node.js 18+ for BigInt support
- React 18+ for concurrent features
- Next.js 14+ for App Router patterns

## Migration Guide

### Database Migration
Execute migration `008_dashboard_columns.sql`:
```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_balance_cents TEXT DEFAULT '0';
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS low_balance_threshold_cents TEXT DEFAULT '100000';
```

### Code Migration
1. Update existing dashboard placeholder components
2. Install recharts dependency: `pnpm add recharts`
3. Configure PostHog events in analytics provider
4. Test account balance sync in Plaid integration

## Troubleshooting

### Common Issues
1. **Missing Balance Data**: Verify Plaid account sync completion
2. **Incorrect Calculations**: Check bigint/string conversion boundaries
3. **Cache Issues**: Clear React Query cache or check HTTP cache headers
4. **Chart Rendering**: Verify recharts compatibility and data format

### Debugging Tools
1. **API Testing**: Use `/api/dashboard` endpoint directly
2. **Query Analysis**: Enable Supabase query logging
3. **Analytics Validation**: Check PostHog event stream
4. **Performance Monitoring**: Use Next.js built-in analytics

## Related Documentation

- [Transaction Categorization System](./categorization-system.md)
- [Plaid Integration Guide](./plaid-integration.md)
- [Analytics Implementation](./analytics-setup.md)
- [Database Schema Reference](./database-schema.md)
- [API Design Patterns](./api-patterns.md)

---

*Generated for Milestone 4 implementation - Dashboard v0 feature set*