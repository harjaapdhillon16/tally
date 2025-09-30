-- 022_add_category_is_active.sql - Add soft delete column for legacy categories
-- Marks legacy fine-grained categories as inactive while preserving referential integrity
-- This allows the UI to filter out deprecated categories without breaking foreign keys

-- Add is_active column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Mark all legacy fine-grained categories as inactive
UPDATE categories 
SET is_active = false
WHERE id IN (
  -- Pre-E-commerce legacy parents (replaced by newer taxonomy)
  '550e8400-e29b-41d4-a716-446655440001', -- Revenue (old)
  '550e8400-e29b-41d4-a716-446655440010', -- Expenses (old parent)
  
  -- Pre-E-commerce legacy categories (salon/general business - replaced by e-commerce taxonomy)
  '550e8400-e29b-41d4-a716-446655440011', -- Rent & Utilities (old)
  '550e8400-e29b-41d4-a716-446655440012', -- Supplies & Inventory (old)
  '550e8400-e29b-41d4-a716-446655440013', -- Equipment & Maintenance (old)
  '550e8400-e29b-41d4-a716-446655440014', -- Staff Wages & Benefits (old)
  '550e8400-e29b-41d4-a716-446655440015', -- Marketing & Advertising (old)
  '550e8400-e29b-41d4-a716-446655440016', -- Professional Services (old)
  '550e8400-e29b-41d4-a716-446655440017', -- Insurance (old)
  '550e8400-e29b-41d4-a716-446655440018', -- Licenses & Permits (old)
  '550e8400-e29b-41d4-a716-446655440019', -- Training & Education (old)
  '550e8400-e29b-41d4-a716-446655440020', -- Software & Technology (old)
  '550e8400-e29b-41d4-a716-446655440021', -- Bank Fees & Interest (old)
  '550e8400-e29b-41d4-a716-446655440022', -- Travel & Transportation (old)
  '550e8400-e29b-41d4-a716-446655440023', -- Office Supplies (old)
  '550e8400-e29b-41d4-a716-446655440024', -- Other Operating Expenses (old)
  
  -- Payment Processing children (legacy - replaced by payment_processing_fees umbrella)
  '550e8400-e29b-41d4-a716-446655440311', -- Stripe Fees
  '550e8400-e29b-41d4-a716-446655440312', -- PayPal Fees
  '550e8400-e29b-41d4-a716-446655440313', -- Shop Pay Fees
  '550e8400-e29b-41d4-a716-446655440314', -- BNPL Fees
  
  -- Marketing children (legacy - replaced by marketing_ads umbrella)
  '550e8400-e29b-41d4-a716-446655440302', -- Marketing & Advertising (old parent)
  '550e8400-e29b-41d4-a716-446655440321', -- Meta Ads
  '550e8400-e29b-41d4-a716-446655440322', -- Google Ads
  '550e8400-e29b-41d4-a716-446655440323', -- TikTok Ads
  '550e8400-e29b-41d4-a716-446655440324', -- Other Ads
  
  -- Software/Platform children (legacy - replaced by software_subscriptions umbrella)
  '550e8400-e29b-41d4-a716-446655440331', -- Shopify Platform
  '550e8400-e29b-41d4-a716-446655440332', -- App Subscriptions
  '550e8400-e29b-41d4-a716-446655440333', -- Email/SMS Tools
  
  -- Fulfillment/Logistics (legacy - replaced by operations_logistics umbrella)
  '550e8400-e29b-41d4-a716-446655440341', -- Fulfillment & 3PL Fees
  '550e8400-e29b-41d4-a716-446655440342', -- Warehouse Storage
  '550e8400-e29b-41d4-a716-446655440343', -- Shipping Expense (legacy)
  '550e8400-e29b-41d4-a716-446655440344', -- Returns Processing (old ID, replaced by -208)
  
  -- General Business (legacy - replaced by general_administrative umbrella)
  '550e8400-e29b-41d4-a716-446655440351', -- Software (General)
  '550e8400-e29b-41d4-a716-446655440352', -- Professional Services
  '550e8400-e29b-41d4-a716-446655440353', -- Rent & Utilities
  '550e8400-e29b-41d4-a716-446655440354', -- Insurance
  '550e8400-e29b-41d4-a716-446655440355', -- Payroll/Contractors
  '550e8400-e29b-41d4-a716-446655440356', -- Office Supplies
  '550e8400-e29b-41d4-a716-446655440357', -- Travel & Transportation
  '550e8400-e29b-41d4-a716-446655440358', -- Bank Fees
  '550e8400-e29b-41d4-a716-446655440359', -- Other Operating Expenses
  '550e8400-e29b-41d4-a716-446655440402', -- Duties & Import Taxes (legacy)
  
  -- COGS Legacy (replaced by two-tier umbrella buckets)
  '550e8400-e29b-41d4-a716-446655440201', -- Inventory Purchases
  '550e8400-e29b-41d4-a716-446655440202', -- Inbound Freight
  '550e8400-e29b-41d4-a716-446655440203', -- Packaging Supplies
  '550e8400-e29b-41d4-a716-446655440204', -- Manufacturing Costs
  
  -- Revenue Legacy (replaced by two-tier umbrella buckets)
  '550e8400-e29b-41d4-a716-446655440101', -- DTC Sales
  '550e8400-e29b-41d4-a716-446655440103', -- Discounts (Contra-Revenue)
  '550e8400-e29b-41d4-a716-446655440104', -- Refunds & Allowances (old)
  
  -- Other Legacy
  '550e8400-e29b-41d4-a716-446655440360', -- Amazon Fees
  '550e8400-e29b-41d4-a716-446655440501', -- Shopify Payouts Clearing (old)
  '550e8400-e29b-41d4-a716-446655440502'  -- Amazon Payouts
);

-- Ensure all two-tier umbrella buckets are marked active (explicit verification)
UPDATE categories 
SET is_active = true
WHERE id IN (
  -- Two-tier umbrella buckets (Tier 2)
  '550e8400-e29b-41d4-a716-446655440102', -- Shipping Income
  '550e8400-e29b-41d4-a716-446655440105', -- Refunds (Contra)
  '550e8400-e29b-41d4-a716-446655440205', -- Supplier Purchases
  '550e8400-e29b-41d4-a716-446655440206', -- Packaging
  '550e8400-e29b-41d4-a716-446655440207', -- Shipping & Postage
  '550e8400-e29b-41d4-a716-446655440208', -- Returns Processing
  '550e8400-e29b-41d4-a716-446655440301', -- Payment Processing Fees
  '550e8400-e29b-41d4-a716-446655440303', -- Marketing & Ads
  '550e8400-e29b-41d4-a716-446655440304', -- Software Subscriptions
  '550e8400-e29b-41d4-a716-446655440305', -- Labor
  '550e8400-e29b-41d4-a716-446655440306', -- Operations & Logistics
  '550e8400-e29b-41d4-a716-446655440307', -- General & Administrative
  '550e8400-e29b-41d4-a716-446655440308', -- Miscellaneous
  '550e8400-e29b-41d4-a716-446655440503', -- Payouts Clearing
  '550e8400-e29b-41d4-a716-446655440601', -- Taxes & Liabilities
  
  -- Parent categories (Tier 1)
  '550e8400-e29b-41d4-a716-446655440100', -- Revenue
  '550e8400-e29b-41d4-a716-446655440200', -- Cost of Goods Sold
  '550e8400-e29b-41d4-a716-446655440300', -- Operating Expenses
  '550e8400-e29b-41d4-a716-446655440400', -- Taxes & Liabilities
  '550e8400-e29b-41d4-a716-446655440500'  -- Clearing
);

-- Create index for faster filtering on is_active column
CREATE INDEX IF NOT EXISTS idx_categories_is_active 
  ON categories(is_active) 
  WHERE org_id IS NULL;

-- Add column comment for documentation
COMMENT ON COLUMN categories.is_active IS 
  'Marks categories as active (visible in UI) or inactive (legacy/deprecated). Added in migration 022 to soft-delete legacy fine-grained categories while preserving referential integrity.';

-- ============================================================================
-- VERIFICATION QUERIES (uncomment to run manually after migration)
-- ============================================================================

-- Count active vs inactive categories
-- SELECT is_active, COUNT(*) as count
-- FROM categories 
-- WHERE org_id IS NULL 
-- GROUP BY is_active
-- ORDER BY is_active DESC;
-- Expected: is_active=true: ~20 categories, is_active=false: ~52 categories (16 pre-ecommerce + 36 ecommerce legacy)

-- List all inactive categories (should be legacy fine-grained ones)
-- SELECT id, name, parent_id 
-- FROM categories 
-- WHERE is_active = false AND org_id IS NULL 
-- ORDER BY name;

-- List all active categories (should be two-tier umbrella buckets + parents)
-- SELECT id, name, parent_id 
-- FROM categories 
-- WHERE is_active = true AND org_id IS NULL 
-- ORDER BY name;

-- Verify no active transactions reference inactive categories
-- SELECT COUNT(*) as count
-- FROM transactions t
-- JOIN categories c ON t.category_id = c.id
-- WHERE c.is_active = false;
-- Expected: 0 (all remapped in migration 019)

-- Verify no active rules reference inactive categories  
-- SELECT COUNT(*) as count
-- FROM rules r
-- JOIN categories c ON r.category_id = c.id
-- WHERE c.is_active = false;
-- Expected: 0 (all remapped in migration 019/020)
