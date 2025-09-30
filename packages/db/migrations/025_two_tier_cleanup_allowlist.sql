-- 025_two_tier_cleanup_allowlist.sql
-- Phase 1: Create allowlist table and populate with canonical two-tier taxonomy IDs
-- This is the definitive list of categories that should exist after cleanup

-- Create the allowlist table
CREATE TABLE IF NOT EXISTS categories_allowlist (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2)),
  is_pnl BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Populate with Tier 1 parent categories
INSERT INTO categories_allowlist (id, name, type, tier, is_pnl, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440100', 'Revenue', 'revenue', 1, true, 'Tier 1 parent'),
  ('550e8400-e29b-41d4-a716-446655440200', 'Cost of Goods Sold', 'cogs', 1, true, 'Tier 1 parent'),
  ('550e8400-e29b-41d4-a716-446655440300', 'Operating Expenses', 'opex', 1, true, 'Tier 1 parent'),
  ('550e8400-e29b-41d4-a716-446655440400', 'Taxes & Liabilities', 'liability', 1, false, 'Tier 1 parent - non P&L'),
  ('550e8400-e29b-41d4-a716-446655440500', 'Clearing', 'clearing', 1, false, 'Tier 1 parent - non P&L')
ON CONFLICT (id) DO NOTHING;

-- Populate with Tier 2 Revenue buckets
INSERT INTO categories_allowlist (id, name, type, tier, is_pnl, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440106', 'Sales Revenue', 'revenue', 2, true, 'Two-tier bucket'),
  ('550e8400-e29b-41d4-a716-446655440102', 'Shipping Income', 'revenue', 2, true, 'Two-tier bucket'),
  ('550e8400-e29b-41d4-a716-446655440105', 'Refunds (Contra-Revenue)', 'revenue', 2, true, 'Two-tier bucket')
ON CONFLICT (id) DO NOTHING;

-- Populate with Tier 2 COGS buckets
INSERT INTO categories_allowlist (id, name, type, tier, is_pnl, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440205', 'Supplier Purchases', 'cogs', 2, true, 'Two-tier bucket'),
  ('550e8400-e29b-41d4-a716-446655440206', 'Packaging', 'cogs', 2, true, 'Two-tier bucket'),
  ('550e8400-e29b-41d4-a716-446655440207', 'Shipping & Postage', 'cogs', 2, true, 'Two-tier bucket'),
  ('550e8400-e29b-41d4-a716-446655440208', 'Returns Processing', 'cogs', 2, true, 'Two-tier bucket')
ON CONFLICT (id) DO NOTHING;

-- Populate with Tier 2 OpEx buckets
INSERT INTO categories_allowlist (id, name, type, tier, is_pnl, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440301', 'Payment Processing Fees', 'opex', 2, true, 'Two-tier bucket'),
  ('550e8400-e29b-41d4-a716-446655440303', 'Marketing & Ads', 'opex', 2, true, 'Two-tier bucket'),
  ('550e8400-e29b-41d4-a716-446655440304', 'Software Subscriptions', 'opex', 2, true, 'Two-tier bucket'),
  ('550e8400-e29b-41d4-a716-446655440305', 'Labor', 'opex', 2, true, 'Two-tier bucket'),
  ('550e8400-e29b-41d4-a716-446655440306', 'Operations & Logistics', 'opex', 2, true, 'Two-tier bucket'),
  ('550e8400-e29b-41d4-a716-446655440307', 'General & Administrative', 'opex', 2, true, 'Two-tier bucket'),
  ('550e8400-e29b-41d4-a716-446655440308', 'Miscellaneous', 'opex', 2, true, 'Two-tier bucket')
ON CONFLICT (id) DO NOTHING;

-- Populate with essential non-P&L buckets (hidden from UI but required for correctness)
INSERT INTO categories_allowlist (id, name, type, tier, is_pnl, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440401', 'Sales Tax Payable', 'liability', 2, false, 'Hidden non-P&L - required'),
  ('550e8400-e29b-41d4-a716-446655440503', 'Payouts Clearing', 'clearing', 2, false, 'Hidden non-P&L - required'),
  ('550e8400-e29b-41d4-a716-446655440601', 'Taxes & Liabilities', 'clearing', 2, false, 'Hidden non-P&L - required')
ON CONFLICT (id) DO NOTHING;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_categories_allowlist_type ON categories_allowlist(type);

-- Add comment
COMMENT ON TABLE categories_allowlist IS 
  'Canonical two-tier taxonomy allowlist. Only categories in this table should exist in the categories table after cleanup migration 026.';
