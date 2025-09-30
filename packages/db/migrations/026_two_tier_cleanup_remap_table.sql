-- 026_two_tier_cleanup_remap_table.sql
-- Phase 2: Create and populate the remap table
-- Maps every non-allowlist category to its target two-tier bucket

-- Create the remap table
CREATE TABLE IF NOT EXISTS category_remap (
  source_id UUID NOT NULL,
  target_id UUID NOT NULL,
  source_name TEXT NOT NULL,
  target_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source_id)
);

-- Add foreign key to allowlist to ensure target is valid
ALTER TABLE category_remap 
  ADD CONSTRAINT category_remap_target_fk 
  FOREIGN KEY (target_id) REFERENCES categories_allowlist(id);

-- ============================================================================
-- GLOBAL LEGACY E-COMMERCE CATEGORIES → TWO-TIER BUCKETS
-- ============================================================================

-- Revenue legacy → Sales Revenue or Refunds
INSERT INTO category_remap (source_id, target_id, source_name, target_name, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440106', 'DTC Sales', 'Sales Revenue', 'DTC sales is general sales revenue'),
  ('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440105', 'Discounts (Contra-Revenue)', 'Refunds (Contra-Revenue)', 'Discounts are contra-revenue like refunds'),
  ('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440105', 'Refunds & Allowances (Contra-Revenue)', 'Refunds (Contra-Revenue)', 'Direct mapping to refunds bucket')
ON CONFLICT (source_id) DO NOTHING;

-- COGS legacy → Supplier Purchases, Packaging, or Shipping & Postage
INSERT INTO category_remap (source_id, target_id, source_name, target_name, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440205', 'Inventory Purchases', 'Supplier Purchases', 'Inventory purchases are supplier purchases'),
  ('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440207', 'Inbound Freight', 'Shipping & Postage', 'Inbound freight is shipping cost'),
  ('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440206', 'Packaging Supplies', 'Packaging', 'Direct mapping to packaging bucket'),
  ('550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440205', 'Manufacturing Costs', 'Supplier Purchases', 'Manufacturing is part of supplier/production costs'),
  ('550e8400-e29b-41d4-a716-446655440344', '550e8400-e29b-41d4-a716-446655440208', 'Returns Processing', 'Returns Processing', 'Direct mapping (old ID to new ID)')
ON CONFLICT (source_id) DO NOTHING;

-- Payment Processing children → Payment Processing Fees umbrella
INSERT INTO category_remap (source_id, target_id, source_name, target_name, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440311', '550e8400-e29b-41d4-a716-446655440301', 'Stripe Fees', 'Payment Processing Fees', 'Stripe is a payment processor'),
  ('550e8400-e29b-41d4-a716-446655440312', '550e8400-e29b-41d4-a716-446655440301', 'PayPal Fees', 'Payment Processing Fees', 'PayPal is a payment processor'),
  ('550e8400-e29b-41d4-a716-446655440313', '550e8400-e29b-41d4-a716-446655440301', 'Shop Pay Fees', 'Payment Processing Fees', 'Shop Pay is a payment processor'),
  ('550e8400-e29b-41d4-a716-446655440314', '550e8400-e29b-41d4-a716-446655440301', 'BNPL Fees', 'Payment Processing Fees', 'BNPL is a payment method fee')
ON CONFLICT (source_id) DO NOTHING;

-- Marketing children → Marketing & Ads umbrella
INSERT INTO category_remap (source_id, target_id, source_name, target_name, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440303', 'Marketing & Advertising', 'Marketing & Ads', 'Old parent to new umbrella'),
  ('550e8400-e29b-41d4-a716-446655440321', '550e8400-e29b-41d4-a716-446655440303', 'Meta Ads', 'Marketing & Ads', 'Meta ads are marketing'),
  ('550e8400-e29b-41d4-a716-446655440322', '550e8400-e29b-41d4-a716-446655440303', 'Google Ads', 'Marketing & Ads', 'Google ads are marketing'),
  ('550e8400-e29b-41d4-a716-446655440323', '550e8400-e29b-41d4-a716-446655440303', 'TikTok Ads', 'Marketing & Ads', 'TikTok ads are marketing'),
  ('550e8400-e29b-41d4-a716-446655440324', '550e8400-e29b-41d4-a716-446655440303', 'Other Ads', 'Marketing & Ads', 'Other ads are marketing')
ON CONFLICT (source_id) DO NOTHING;

-- Software/Platform children → Software Subscriptions umbrella
INSERT INTO category_remap (source_id, target_id, source_name, target_name, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440331', '550e8400-e29b-41d4-a716-446655440304', 'Shopify Platform', 'Software Subscriptions', 'Shopify is a software platform'),
  ('550e8400-e29b-41d4-a716-446655440332', '550e8400-e29b-41d4-a716-446655440304', 'App Subscriptions', 'Software Subscriptions', 'Apps are software'),
  ('550e8400-e29b-41d4-a716-446655440333', '550e8400-e29b-41d4-a716-446655440304', 'Email/SMS Tools', 'Software Subscriptions', 'Email/SMS tools are software'),
  ('550e8400-e29b-41d4-a716-446655440351', '550e8400-e29b-41d4-a716-446655440304', 'Software (General)', 'Software Subscriptions', 'General software to umbrella')
ON CONFLICT (source_id) DO NOTHING;

-- Fulfillment & Logistics children → Operations & Logistics umbrella
INSERT INTO category_remap (source_id, target_id, source_name, target_name, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440341', '550e8400-e29b-41d4-a716-446655440306', 'Fulfillment & 3PL Fees', 'Operations & Logistics', '3PL is operations'),
  ('550e8400-e29b-41d4-a716-446655440342', '550e8400-e29b-41d4-a716-446655440306', 'Warehouse Storage', 'Operations & Logistics', 'Warehousing is operations'),
  ('550e8400-e29b-41d4-a716-446655440343', '550e8400-e29b-41d4-a716-446655440207', 'Shipping Expense', 'Shipping & Postage', 'Shipping expense is shipping & postage')
ON CONFLICT (source_id) DO NOTHING;

-- General Business children → General & Administrative, Labor, or Miscellaneous
INSERT INTO category_remap (source_id, target_id, source_name, target_name, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440352', '550e8400-e29b-41d4-a716-446655440307', 'Professional Services', 'General & Administrative', 'Professional services are G&A'),
  ('550e8400-e29b-41d4-a716-446655440353', '550e8400-e29b-41d4-a716-446655440307', 'Rent & Utilities', 'General & Administrative', 'Rent & utilities are G&A'),
  ('550e8400-e29b-41d4-a716-446655440354', '550e8400-e29b-41d4-a716-446655440307', 'Insurance', 'General & Administrative', 'Insurance is G&A'),
  ('550e8400-e29b-41d4-a716-446655440355', '550e8400-e29b-41d4-a716-446655440305', 'Payroll/Contractors', 'Labor', 'Payroll is labor'),
  ('550e8400-e29b-41d4-a716-446655440356', '550e8400-e29b-41d4-a716-446655440307', 'Office Supplies', 'General & Administrative', 'Office supplies are G&A'),
  ('550e8400-e29b-41d4-a716-446655440357', '550e8400-e29b-41d4-a716-446655440308', 'Travel & Transportation', 'Miscellaneous', 'Travel is miscellaneous'),
  ('550e8400-e29b-41d4-a716-446655440358', '550e8400-e29b-41d4-a716-446655440307', 'Bank Fees', 'General & Administrative', 'Bank fees are G&A'),
  ('550e8400-e29b-41d4-a716-446655440359', '550e8400-e29b-41d4-a716-446655440308', 'Other Operating Expenses', 'Miscellaneous', 'Other ops to miscellaneous')
ON CONFLICT (source_id) DO NOTHING;

-- Clearing/Tax legacy → appropriate buckets
INSERT INTO category_remap (source_id, target_id, source_name, target_name, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440307', 'Duties & Import Taxes', 'General & Administrative', 'Import duties are operational costs'),
  ('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440503', 'Shopify Payouts Clearing', 'Payouts Clearing', 'Shopify payouts to general payouts'),
  ('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440503', 'Amazon Payouts', 'Payouts Clearing', 'Amazon payouts to general payouts'),
  ('550e8400-e29b-41d4-a716-446655440360', '550e8400-e29b-41d4-a716-446655440306', 'Amazon Fees', 'Operations & Logistics', 'Amazon marketplace fees are operational')
ON CONFLICT (source_id) DO NOTHING;

-- Old salon/generic parent categories (marked inactive) → appropriate buckets
INSERT INTO category_remap (source_id, target_id, source_name, target_name, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440100', 'Revenue', 'Revenue', 'Old parent to new parent (same tier)'),
  ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440300', 'Expenses', 'Operating Expenses', 'Old expense parent to OpEx parent')
ON CONFLICT (source_id) DO NOTHING;

-- Old salon/generic expense children → appropriate umbrella buckets
INSERT INTO category_remap (source_id, target_id, source_name, target_name, reason) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440307', 'Rent & Utilities', 'General & Administrative', 'Rent is G&A'),
  ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440205', 'Supplies & Inventory', 'Supplier Purchases', 'Supplies are purchases'),
  ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440307', 'Equipment & Maintenance', 'General & Administrative', 'Equipment is G&A'),
  ('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440305', 'Staff Wages & Benefits', 'Labor', 'Wages are labor'),
  ('550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440303', 'Marketing & Advertising', 'Marketing & Ads', 'Marketing to marketing umbrella'),
  ('550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440307', 'Professional Services', 'General & Administrative', 'Professional services are G&A'),
  ('550e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440307', 'Insurance', 'General & Administrative', 'Insurance is G&A'),
  ('550e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440307', 'Licenses & Permits', 'General & Administrative', 'Licenses are G&A'),
  ('550e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440307', 'Training & Education', 'General & Administrative', 'Training is G&A'),
  ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440304', 'Software & Technology', 'Software Subscriptions', 'Software to software umbrella'),
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440307', 'Bank Fees & Interest', 'General & Administrative', 'Bank fees are G&A'),
  ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440308', 'Travel & Transportation', 'Miscellaneous', 'Travel is miscellaneous'),
  ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440307', 'Office Supplies', 'General & Administrative', 'Office supplies are G&A'),
  ('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440308', 'Other Operating Expenses', 'Miscellaneous', 'Other ops to miscellaneous')
ON CONFLICT (source_id) DO NOTHING;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_category_remap_source ON category_remap(source_id);
CREATE INDEX IF NOT EXISTS idx_category_remap_target ON category_remap(target_id);

-- Add comment
COMMENT ON TABLE category_remap IS 
  'Mapping table for legacy/global categories to two-tier taxonomy buckets. Used by migration 027 to remap all references before deletion.';
