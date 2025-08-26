# Nexus

> **AI-Powered Financial Automation for SMBs**  
> Starting with salons, Nexus helps small business owners automate bookkeeping, manage cash flow, and export tax-ready data — without the complexity of traditional accounting software.

---

## 🚀 Vision

Small and medium-sized businesses (SMBs) run on thin margins and lack financial visibility. Bookkeeping is expensive, time-consuming, and reactive. Nexus solves this by delivering:

- **Automated bookkeeping**: Transactions ingested from bank/POS feeds and categorized automatically.
- **Cash flow intelligence**: Predictive dashboards designed for non-financial owners.
- **Industry-specific insights**: Salon-focused reporting (commissions, inventory, product sales).
- **Tax-ready exports**: One-click QuickBooks/Xero push or CSV reports.

💡 **Wedge:** Start with salons (fragmented, underserved, highly active online communities).  
🌍 **Long-term:** Expand across service SMBs → become the “Financial OS” for small businesses:contentReference[oaicite:3]{index=3}.

---

## 📦 MVP Scope (8–10 weeks)

**A salon owner can:**

1. Connect bank accounts/POS (Plaid, Square).
2. View a simple cashflow + P&L dashboard.
3. Correct low-confidence categorizations.
4. Export tax-ready data (CSV or QuickBooks/Xero).

**Out of scope for MVP:** invoicing, payroll, inventory, multi-currency, accrual accounting:contentReference[oaicite:4]{index=4}.

---

## 🛠️ Tech Stack

**Frontend**

- [Next.js](https://nextjs.org/) + React (SSR for auth/webhooks; deployed on Vercel)
- [TailwindCSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (UI components)
- [TanStack Query](https://tanstack.com/query/latest) (data fetching/caching)

**Backend & Data**

- [Supabase](https://supabase.com/) (Postgres, Auth, RLS, Storage, Realtime)
- Supabase Edge Functions (secure webhooks for Plaid, Merge.dev, Stripe)
- JSONB storage for raw payloads

**Integrations**

- [Plaid](https://plaid.com/) — bank/card transactions
- [Merge.dev](https://merge.dev/) — QuickBooks/Xero exports
- [Square](https://squareup.com/) — POS sales (later Vagaro/Fresha)
- [Mindee](https://mindee.com/) or Veryfi — OCR for receipts
- [OpenAI](https://openai.com/) or Claude — categorization/summary + embeddings
- [Stripe](https://stripe.com/) — billing/payments
- [PostHog](https://posthog.com/) — product analytics
- [Sentry](https://sentry.io/) — error monitoring
- [Langfuse](https://langfuse.com/) — LLM observability:contentReference[oaicite:5]{index=5}

**DevOps/Sec**

- Deploys via Vercel + Supabase (minimal ops)
- Secrets in Vercel Env / Supabase Vault
- GitHub Actions CI (lint, typecheck, tests, Playwright e2e)

**Testing & Quality**

- [Playwright](https://playwright.dev/) — E2E testing across Chrome, Firefox, Safari
- [Vitest](https://vitest.dev/) — Unit testing with property-based testing
- [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) — Code quality
- Comprehensive test coverage: unit, integration, and E2E tests

---

## 🗂 Repo Structure

```bash
nexus/
├─ apps/
│  ├─ web/           # Next.js app (UI + API routes)
│  └─ edge/          # Supabase Edge Functions (Plaid, Stripe, OCR, jobs)
├─ packages/
│  ├─ db/            # SQL migrations, seeders, typed queries
│  ├─ types/         # Shared TS types & API contracts
│  ├─ connectors/    # Plaid, Square, Merge, OCR SDKs
│  ├─ analytics/     # PostHog, Sentry, Langfuse clients
│  └─ categorizer/   # Hybrid rules + LLM categorization engine
├─ services/
│  ├─ ingestion/     # Normalize raw → canonical
│  ├─ exports/       # CSV + QBO/Xero mapping
│  ├─ auth/          # Org scoping, RLS helpers
│  └─ billing/       # Stripe plans, trial logic
├─ docs/             # ADRs, API contracts, runbooks, testing guide
├─ scripts/          # One-off ops: rotate keys, restore backups
└─ .github/workflows # CI pipelines
```

---

## 🧪 Testing & Development

### Quick Start

```bash
# Install dependencies
pnpm install

# Set up database and seed with sample data
pnpm run migrate  # Apply database schema
pnpm run seed     # Generate realistic salon transaction data

# Start development
pnpm run dev      # Start Next.js dev server

# Run tests
pnpm run test     # Unit tests across all packages
pnpm run e2e      # End-to-end tests with Playwright
pnpm run lint     # ESLint + Prettier
pnpm run typecheck # TypeScript compilation
```

### Testing Strategy

**🎭 End-to-End Testing (Playwright)**

- Tests across Chrome, Firefox, and Safari
- Automatic dev server management
- Visual debugging and trace collection
- 21/24 tests passing (87.5% success rate)

**⚡ Unit Testing (Vitest)**

- Fast, isolated component and function tests
- Property-based testing for financial calculations
- 9 tests covering database seeding logic

**🔧 Integration Testing**

- API endpoint validation
- Database transaction testing
- Real Supabase connection testing

### Key Test Coverage

- ✅ Homepage rendering with proper branding
- ✅ Health API endpoint functionality
- ✅ Dashboard/app shell with sidebar and topbar
- ✅ Authentication flow handling
- ✅ 404 error page handling
- ✅ Financial transaction generation
- ✅ Database seeding operations

### Test Commands

```bash
# Run specific test types
pnpm run e2e                    # All E2E tests
pnpm run e2e --project=chromium # Chrome only
pnpm run test                   # All unit tests
pnpm --filter @nexus/db test    # Database package tests

# Debugging
pnpm --filter web exec playwright test --ui     # Visual test runner
pnpm --filter web exec playwright test --debug  # Step-by-step debugging

# CI/CD pipeline
pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run e2e
```

### 📖 Documentation

- **[Testing Guide](./docs/testing.md)** - Comprehensive testing documentation including setup, best practices, and troubleshooting
- **[Database Package](./docs/database-package.md)** - Database migrations, seeding, and client configuration
- **[Database Schema](./docs/database-schema.md)** - Complete schema documentation with relationships
- **[Analytics Package](./docs/analytics-package.md)** - Observability and monitoring setup

---

_For detailed testing setup, debugging, and CI/CD integration, see [docs/testing.md](./docs/testing.md)_
