# Authentication and Organization Onboarding

This document covers the Supabase authentication system and organization onboarding flow implemented in Milestone 1.

## Overview

The authentication system provides secure user registration, login, password reset, and organization-scoped access control. After signing up, users are guided through an onboarding flow to create their organization, which becomes the primary scoping mechanism for all data access.

## Components Implemented

### 1. Supabase Client Helpers

**File**: `apps/web/src/lib/supabase.ts`

Centralized Supabase client creation utilities:

- `createClient()` - For client components
- `createServerClient()` - For server components and API routes
- `createMiddlewareSupabaseClient()` - For middleware authentication

This centralizes imports and reduces duplication across the application.

### 2. Route Protection Middleware

**File**: `apps/web/src/middleware.ts`

Enhanced middleware that:

- Guards all `/(app)/**` paths by default (dashboard, transactions, reports, settings, connections, exports, onboarding)
- Keeps auth pages public (`/sign-in`, `/sign-up`, `/reset-password`)
- Redirects unauthenticated users to `/sign-in`
- Redirects authenticated users away from auth pages to `/dashboard`
- Handles root path redirects based on authentication status

**Protected Routes**:
- `/dashboard`
- `/transactions`
- `/reports` 
- `/settings`
- `/connections`
- `/exports`
- `/onboarding`

### 3. Password Reset Flow

**File**: `apps/web/src/app/(auth)/reset-password/page.tsx`

Two-step password reset process:

**Step A - Request Reset**:
- User enters email address
- Calls `supabase.auth.resetPasswordForEmail()` 
- Sends reset link to email with redirect to `/reset-password`

**Step B - Set New Password**:
- Handles URL hash parameters from email link
- Detects recovery token and switches to password reset form
- Validates password confirmation and minimum length
- Updates password via `supabase.auth.updateUser()`
- Redirects to dashboard on success

**Features**:
- Client-side password validation (minimum 6 characters, confirmation matching)
- Error handling with inline error display (consistent with existing auth pages)
- Success messages with auto-redirect
- Back-to-sign-in link

## Integration Points

### Database Dependencies

The system integrates with the following database tables:
- `auth.users` (Supabase managed)
- `user_org_roles` (for organization membership verification)
- `orgs` (for organization data)

### Environment Variables

Required environment variables for authentication:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server operations

## Security Considerations

1. **Client vs Server Clients**: Different Supabase clients are used for different contexts to maintain proper security boundaries
2. **Route Protection**: All app routes are protected by default at the middleware level
3. **Token Handling**: Password reset tokens are handled securely through URL hash parameters
4. **Error Messages**: Error handling provides user-friendly messages without exposing system internals

### 4. Organization Onboarding Flow

The onboarding system guides new users through creating their first organization and sets up the necessary data structures.

**File**: `apps/web/src/app/(app)/onboarding/page.tsx`

**Flow Overview**:
1. User arrives at `/onboarding` after sign-up (redirected by middleware)
2. Form captures organization details with client-side validation
3. Submits to `/api/auth/org/create` endpoint
4. On success, redirects to dashboard

**Form Fields**:
- **Organization Name** (required) - Business name
- **Industry** (required) - Dropdown with salon/beauty as default, plus restaurant, retail, professional services, other
- **Timezone** (required) - Auto-detected user timezone, editable
- **Tax Year Start** (required) - Dropdown with common fiscal year start dates

**Validation**: Uses Zod schema validation on both client and server side for type safety

### 5. Organization Creation API

**File**: `apps/web/src/app/api/auth/org/create/route.ts`

**Operations Performed**:
1. **Authentication Check** - Verifies user session
2. **Request Validation** - Validates payload against `orgCreateRequestSchema`
3. **Organization Creation** - Inserts into `orgs` table with generated UUID
4. **Owner Assignment** - Creates `user_org_roles` record with 'owner' role
5. **Category Seeding** - Copies global categories to org-specific categories:
   - Fetches all global categories (where `org_id` is NULL)
   - Creates org-specific copies maintaining parent-child relationships
   - Maps global category IDs to new org-specific IDs
6. **Cookie Setting** - Sets `orgId` cookie for subsequent requests
7. **Response** - Returns `{ orgId }` with 201 status

**Error Handling**:
- 401 for unauthenticated requests
- 400 for validation errors
- 500 for database errors
- Detailed error logging for debugging

### 6. Enhanced Route Protection

The middleware now includes organization-aware redirects:

**Authentication Flow**:
- Unauthenticated users → `/sign-in`
- Authenticated users without org → `/onboarding`
- Authenticated users with org → `/dashboard`

**Redirect Logic**:
- After successful sign-in: checks for org membership before redirecting
- App page access: verifies org membership, redirects to onboarding if none
- Root path `/`: smart redirect based on auth and org status

### 7. Organization Switching Component

**File**: `apps/web/src/components/org-switcher.tsx`

The OrgSwitcher provides organization context switching for users with multiple organization memberships.

**Features**:
- **Membership Fetching** - Queries `user_org_roles` joined with `orgs` to display organization names and roles
- **Current Organization Display** - Shows active organization from `orgId` cookie
- **Dropdown Interface** - Lists all user memberships with role indicators (owner, admin, member)
- **Cookie Management** - Updates `orgId` cookie on selection and triggers page refresh for re-scoping
- **Loading States** - Handles loading, empty, and error states gracefully

**User Experience**:
- Auto-detects current org from cookie or defaults to first membership
- Visual indicator (checkmark) shows currently selected organization
- Role badges show user's permission level in each organization
- Click outside to close dropdown

### 8. Enhanced Organization Scoping

**File**: `apps/web/src/lib/api/with-org.ts`

Enhanced helper functions for API route organization scoping:

**`withOrgFromRequest(request)`**:
- **Flexible Org Resolution** - Supports multiple sources with precedence:
  1. `x-org-id` header (highest priority)
  2. `orgId` cookie (browser requests)  
  3. `orgId` query parameter (fallback)
- **Membership Verification** - Ensures user belongs to resolved organization
- **Error Handling** - Returns 400/401/403 with appropriate error messages

**Updated API Routes**:
- `/api/connections/list` - Uses `withOrgFromRequest` for flexible org resolution
- `/api/connections/create` - Validates request orgId matches authenticated org
- `/api/transactions/list` - Scoped to authenticated organization
- `/api/exports/create` - Includes orgId validation and scoping

**Security Benefits**:
1. **Defense in Depth** - Multiple validation layers (middleware + API route level)
2. **Flexible Access** - Supports different client types (browser, API, mobile)
3. **Audit Trail** - Consistent error responses and logging
4. **RLS Enforcement** - Database queries automatically scoped by organization

### 9. Empty State Dashboard

**File**: `apps/web/src/app/(app)/dashboard/page.tsx`

The dashboard provides an intelligent user experience that adapts based on the organization's setup status.

**States**:
- **Loading State** - Shows skeleton components while checking connections
- **Empty State** - Displays when no connections are found for the organization
- **Full Dashboard** - Shows complete metrics when connections exist

**Empty State Features**:
- **Zero Metrics Display** - Shows $0.00 values for all financial metrics with helpful hints
- **Clear Call-to-Action** - Prominent "Connect Your Bank" button linking to `/connections`
- **Trust Indicators** - "Secure connection powered by Plaid • Bank-level encryption"
- **Organization Context** - Displays the current organization name in the welcome message

**Connection Detection** - Queries the `connections` table for the current organization to determine state

### 10. PostHog Analytics Integration

**Files**: 
- `apps/web/src/components/posthog-identify.tsx`
- `apps/web/src/providers.tsx`

**User Identification**:
- Automatically identifies users with PostHog on session load
- Sets user properties including email and current organization ID
- Updates identification when organization context changes
- Handles sign-in/sign-out events with proper cleanup

**Event Tracking**:
- User identification with distinct ID (user.id)
- Organization context tracking via person properties
- Session state management (identify on sign-in, reset on sign-out)
- Cookie-based org context detection

## Implementation Summary

The complete authentication and organization onboarding system includes:

✅ **Authentication Flow** - Sign-up, sign-in, password reset with Supabase Auth  
✅ **Organization Onboarding** - Wizard-guided org creation with category seeding  
✅ **Route Protection** - Middleware-based authentication and org membership verification  
✅ **Organization Switching** - Multi-org support with cookie-based context switching  
✅ **API Security** - Comprehensive org scoping across all business logic endpoints  
✅ **Empty State UX** - Intelligent dashboard that guides new users to first connection  
✅ **Analytics Integration** - PostHog user identification with org context  
✅ **Error Handling** - Consistent error responses and user-friendly messaging  

## Architecture Benefits

1. **Security-First** - Multiple layers of authentication and authorization
2. **Scalable** - Multi-organization architecture from day one
3. **User-Focused** - Smooth onboarding experience with contextual guidance
4. **Developer-Friendly** - Type-safe APIs with comprehensive error handling
5. **Observable** - Integrated analytics and error tracking from the start

## Next Steps

The system is ready for:
1. ✅ Core authentication and onboarding flow
2. 🔲 Connection management UI (`/connections` page)
3. 🔲 Transaction ingestion and categorization
4. 🔲 Financial reporting and insights
5. 🔲 Export functionality (CSV, QuickBooks, Xero)

## Testing

To test the authentication system:

1. **Sign Up Flow**: Visit `/sign-up` → create account → should redirect to `/dashboard`
2. **Sign In Flow**: Visit `/sign-in` → enter credentials → should redirect to `/dashboard`
3. **Password Reset**: Visit `/reset-password` → enter email → check email for reset link → follow link → set new password
4. **Route Protection**: Try accessing `/dashboard` without authentication → should redirect to `/sign-in`
5. **Auth Page Protection**: Sign in and try visiting `/sign-in` → should redirect to `/dashboard`