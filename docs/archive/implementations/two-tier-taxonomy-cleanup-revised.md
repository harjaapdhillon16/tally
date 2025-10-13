# Two-Tier Taxonomy Cleanup - Revised Plan (Preserves Org Customization)

## Executive Summary

This plan cleans up legacy global categories while **preserving org-specific category customization** for future multi-vertical expansion. The root cause of the "uncategorized" UI issue is missing `type` data on org-specific categories, not the existence of those categories.

## What Changed

**Original Plan (Too Aggressive)**:
- Delete ALL non-allowlist categories (including org-specific)
- Remap org-specific categories to two-tier umbrella buckets
- Lock system to only global two-tier taxonomy

**Revised Plan (Preserves Flexibility)**:
- Delete ONLY global legacy categories (not in allowlist)
- Preserve ALL org-specific categories (for future verticals)
- Backfill missing `type` data on org-specific categories
- Enforce validation at API/UI layer, not DB hard constraints

## Why This Approach?

### Business Justification
1. **Future Vertical Expansion**: Different industries (SaaS, services, retail, etc.) may need different category structures
2. **Org Customization**: Allows power users to define categories matching their specific accounting needs
3. **Migration Path**: Easier to onboard new verticals with custom taxonomies without code changes

### Technical Justification
1. **Root Cause**: The "uncategorized" display is caused by `type=null`, not category existence
2. **Categorizer Already Correct**: Engine only uses two-tier global IDs; org-specific categories are only manual corrections
3. **Lower Risk**: No data loss, reversible changes, preserves user customization
4. **Better UX**: Users can see their historical custom categories, just with proper typing

## Implementation

### Phase 1: Create Allowlist (Migration 025)
**File**: `packages/db/migrations/025_two_tier_cleanup_allowlist.sql`

Creates `categories_allowlist` table with the canonical 19 two-tier categories from `TWO_TIER_TAXONOMY`:
- 5 Tier 1 parents (Revenue, COGS, OpEx, Taxes & Liabilities, Clearing)
- 14 Tier 2 buckets (Sales Revenue, Supplier Purchases, Payment Processing Fees, etc.)

**Purpose**: Define the "source of truth" for global categories.

---

### Phase 2: Create Remap Table (Migration 026)
**File**: `packages/db/migrations/026_two_tier_cleanup_remap_table.sql`

Creates `category_remap` table with mappings from ~60 global legacy categories → two-tier buckets:

**Examples**:
- `DTC Sales` → `Sales Revenue`
- `Stripe Fees` → `Payment Processing Fees`
- `Meta Ads` → `Marketing & Ads`
- `Inventory Purchases` → `Supplier Purchases`

**Scope**: Only global legacy categories (org_id IS NULL, not in allowlist)

---

### Phase 3: Remap All References (Migration 027)
**File**: `packages/db/migrations/027_two_tier_cleanup_remap_references.sql`

Updates all foreign key references in:
- `transactions.category_id`
- `decisions.category_id`
- `corrections.old_category_id` and `corrections.new_category_id`
- `rules.category_id`

**Batch Processing**: Updates in chunks (1000 rows at a time) to avoid long locks

**Verification**: Confirms zero dangling references before proceeding

**Scope**: Only references to global legacy categories (org-specific references unchanged)

---

### Phase 4: Backfill Org-Specific Types (Migration 028) ⭐ KEY FIX
**File**: `packages/db/migrations/028_two_tier_cleanup_backfill_org_types.sql`

Infers `type` for org-specific categories based on name patterns:

**Revenue Patterns**:
- `%revenue%`, `%sales%`, `%income%`, `%service%`, `%gift card%`

**COGS Patterns**:
- `%inventory%`, `%supplies%`, `%packaging%`, `%shipping%`, `%freight%`

**OpEx Patterns**:
- `%expense%`, `%fee%`, `%wages%`, `%marketing%`, `%software%`, `%rent%`, etc.

**Impact**: This fixes the "uncategorized" display issue by ensuring all categories have a valid type that maps to `CategoryTier1` ('revenue', 'cogs', 'opex')

**Fallback**: Any remaining NULL types are logged for manual review

---

### Phase 5: Delete Global Legacy Categories (Migration 029)
**File**: `packages/db/migrations/029_two_tier_cleanup_delete_legacy.sql`

Hard deletes ONLY global categories not in the allowlist:
- Pre-checks: Confirms zero references (from Phase 3)
- Deletion: Removes ~60 global legacy categories
- Verification: Confirms only allowlist + org-specific categories remain

**What is NOT deleted**:
- Org-specific categories (any `org_id IS NOT NULL`)
- Allowlist categories (the 19 two-tier canonical categories)

---

### Phase 6: API Validation (Completed)
**Files**:
- `apps/web/src/app/api/transactions/correct/route.ts`
- `apps/web/src/app/api/transactions/bulk-correct/route.ts`

**Changes**:
1. Added `is_active = true` filter to category validation
2. Added `type IS NOT NULL` check to prevent assigning categories with missing types
3. Updated error messages to be more descriptive

**Effect**: Prevents users from manually assigning:
- Inactive (soft-deleted) categories
- Categories without a type (which would display as "Uncategorized")

---

### Phase 7: UI Already Correct ✅
**File**: `apps/web/src/app/(app)/transactions/page.tsx`

**Existing Logic**:
- Already filters by `is_active = true` (line 575)
- Already allows both global and org-specific categories (line 574)
- Deduplicates by name, preferring org-specific over global (lines 586-597)

**No Changes Needed**: Once Phase 4 backfills types, the UI will automatically display categories correctly.

---

## What This Fixes

### Before
```typescript
// Category: "Hair Services" (org-specific)
type: null  // ❌ Missing type
is_active: true

// getCategoryTier1(null) → returns null
// CategoryPill renders: "Uncategorized" ❌
```

### After
```typescript
// Category: "Hair Services" (org-specific)
type: "revenue"  // ✅ Backfilled in Phase 4
is_active: true

// getCategoryTier1("revenue") → returns "revenue"
// CategoryPill renders: "Revenue · Hair Services" ✅
```

---

## Future Vertical Onboarding

### Example: SaaS Vertical

**Seed Script** (`packages/db/seeds/saas-categories.ts`):
```typescript
const SAAS_CATEGORIES = [
  // Revenue
  { name: 'Subscription Revenue', parent: REVENUE_PARENT_ID, type: 'revenue' },
  { name: 'Professional Services', parent: REVENUE_PARENT_ID, type: 'revenue' },
  { name: 'Usage-Based Revenue', parent: REVENUE_PARENT_ID, type: 'revenue' },
  
  // COGS
  { name: 'Cloud Infrastructure', parent: COGS_PARENT_ID, type: 'cogs' },
  { name: 'Third-Party APIs', parent: COGS_PARENT_ID, type: 'cogs' },
  
  // OpEx
  { name: 'Sales & Marketing', parent: OPEX_PARENT_ID, type: 'opex' },
  { name: 'R&D', parent: OPEX_PARENT_ID, type: 'opex' },
  // ... etc
];

// Insert as org_id = <saas_org_id>
```

**Categorizer Customization**:
- Override `TWO_TIER_TAXONOMY` in categorizer config per org
- Or use org-specific rules table to map to org-specific categories
- LLM prompt can be customized per vertical

---

## Rollback Plan

All migrations are **reversible**:

### Rollback Phase 5 (Delete)
```sql
-- Re-insert deleted categories from backup/audit log
INSERT INTO categories SELECT * FROM categories_audit WHERE ...;
```

### Rollback Phase 4 (Backfill)
```sql
-- Clear backfilled types
UPDATE categories SET type = NULL 
WHERE org_id IS NOT NULL AND updated_at >= '<migration_timestamp>';
```

### Rollback Phase 3 (Remap)
```sql
-- Restore original category_ids from corrections table or audit log
UPDATE transactions SET category_id = corrections.old_category_id FROM ...;
```

**Best Practice**: Take a database snapshot before running migrations.

---

## Testing Checklist

### Unit Tests
- [ ] Verify allowlist count = 19
- [ ] Verify remap table has all expected legacy IDs
- [ ] Test `getCategoryTier1()` with backfilled types

### Integration Tests
- [ ] Run migrations on staging database
- [ ] Verify transaction counts before/after (should match)
- [ ] Spot-check 20 random transactions: category unchanged or mapped correctly
- [ ] Test correction API with org-specific category (should succeed if active + has type)
- [ ] Test correction API with legacy global category (should fail - not found)

### UI Tests
- [ ] Load Transactions page → no "Uncategorized" pills for categories with types
- [ ] Category dropdown → only shows active categories
- [ ] Manually correct transaction → can select org-specific categories
- [ ] Manually correct transaction → cannot select inactive categories

### Performance Tests
- [ ] Migration 027 completes in <5 min for 1M transactions (batch processing)
- [ ] No long locks during migration (check `pg_locks`)
- [ ] Transaction page loads in <2s after migration

---

## Migration Order (MUST RUN IN SEQUENCE)

```bash
# 1. Create allowlist
psql -f packages/db/migrations/025_two_tier_cleanup_allowlist.sql

# 2. Create remap table
psql -f packages/db/migrations/026_two_tier_cleanup_remap_table.sql

# 3. Remap all references (CRITICAL - must complete before deletion)
psql -f packages/db/migrations/027_two_tier_cleanup_remap_references.sql

# 4. Backfill org-specific types (FIXES UI ISSUE)
psql -f packages/db/migrations/028_two_tier_cleanup_backfill_org_types.sql

# 5. Delete global legacy categories (IRREVERSIBLE without backup)
psql -f packages/db/migrations/029_two_tier_cleanup_delete_legacy.sql
```

**DO NOT skip steps or run out of order!**

---

## Success Metrics

Post-migration, verify:

1. **Zero "Uncategorized" displays** for categories with types
2. **All org-specific categories preserved** (count unchanged)
3. **Only 19 global categories remain** (allowlist count)
4. **Zero dangling foreign keys** in transactions/decisions/corrections/rules
5. **API validation prevents** inactive or type-less category assignment
6. **Transaction page loads normally** with proper category pills

---

## Support for Future Verticals

### Adding a New Vertical
1. Create seed script with vertical-specific categories (set `org_id`)
2. Ensure all categories have `type` ('revenue', 'cogs', 'opex', etc.)
3. Set `is_active = true`
4. Optionally customize categorizer rules or LLM prompt for that org
5. UI automatically picks up new categories (no code changes needed)

### Categorizer Behavior
- **Pass-1 (Rules)**: Uses global two-tier IDs by default
- **Pass-2 (LLM)**: Uses global two-tier taxonomy in prompt
- **Manual Corrections**: Can use org-specific categories via UI dropdown
- **Future Enhancement**: Per-org categorizer config to use org-specific categories in engine

---

## Appendix: Category Counts

### Global Categories (Before Cleanup)
- Allowlist (keep): 19
- Legacy E-commerce (delete): ~40
- Legacy Initial (delete): ~20
- **Total to delete**: ~60

### Org-Specific Categories (Preserve All)
Based on provided dump:
- Org `efa96c3a-...`: 21 categories
- Org `5f983978-...`: 22 categories
- Org `b52f30ff-...`: 14 categories
- Org `1abf13ad-...`: 16 categories
- Org `1664031e-...`: 16 categories
- **Total preserved**: ~89

### Final State
- Global: 19 (allowlist only)
- Org-specific: ~89 (all preserved, with backfilled types)
- **Total**: ~108 categories

---

## Document Version
- **Created**: 2025-09-30
- **Last Updated**: 2025-09-30
- **Status**: Ready for Implementation
- **Owner**: Engineering Team
