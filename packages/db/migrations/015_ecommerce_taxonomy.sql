-- 015_ecommerce_taxonomy.sql - E-commerce chart of accounts
-- Seeds global categories for e-commerce businesses using deterministic UUIDs

-- Use deterministic UUIDs based on category slugs for consistency across environments
-- This ensures the same category always gets the same UUID

-- Insert parent categories first
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440100', NULL, 'Revenue', NULL, now()),
  ('550e8400-e29b-41d4-a716-446655440200', NULL, 'Cost of Goods Sold', NULL, now()),
  ('550e8400-e29b-41d4-a716-446655440300', NULL, 'Operating Expenses', NULL, now()),
  ('550e8400-e29b-41d4-a716-446655440400', NULL, 'Taxes & Liabilities', NULL, now()),
  ('550e8400-e29b-41d4-a716-446655440500', NULL, 'Clearing', NULL, now())
ON CONFLICT (id) DO NOTHING;

-- Revenue Categories
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440101', NULL, 'DTC Sales', '550e8400-e29b-41d4-a716-446655440100', now()),
  ('550e8400-e29b-41d4-a716-446655440102', NULL, 'Shipping Income', '550e8400-e29b-41d4-a716-446655440100', now()),
  ('550e8400-e29b-41d4-a716-446655440103', NULL, 'Discounts (Contra-Revenue)', '550e8400-e29b-41d4-a716-446655440100', now()),
  ('550e8400-e29b-41d4-a716-446655440104', NULL, 'Refunds & Allowances (Contra-Revenue)', '550e8400-e29b-41d4-a716-446655440100', now())
ON CONFLICT (id) DO NOTHING;

-- Cost of Goods Sold
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440201', NULL, 'Inventory Purchases', '550e8400-e29b-41d4-a716-446655440200', now()),
  ('550e8400-e29b-41d4-a716-446655440202', NULL, 'Inbound Freight', '550e8400-e29b-41d4-a716-446655440200', now()),
  ('550e8400-e29b-41d4-a716-446655440203', NULL, 'Packaging Supplies', '550e8400-e29b-41d4-a716-446655440200', now()),
  ('550e8400-e29b-41d4-a716-446655440204', NULL, 'Manufacturing Costs', '550e8400-e29b-41d4-a716-446655440200', now())
ON CONFLICT (id) DO NOTHING;

-- Operating Expenses - Payment Processing (parent category)
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440301', NULL, 'Payment Processing Fees', '550e8400-e29b-41d4-a716-446655440300', now())
ON CONFLICT (id) DO NOTHING;

-- Operating Expenses - Payment Processing (child categories)
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440311', NULL, 'Stripe Fees', '550e8400-e29b-41d4-a716-446655440301', now()),
  ('550e8400-e29b-41d4-a716-446655440312', NULL, 'PayPal Fees', '550e8400-e29b-41d4-a716-446655440301', now()),
  ('550e8400-e29b-41d4-a716-446655440313', NULL, 'Shop Pay Fees', '550e8400-e29b-41d4-a716-446655440301', now()),
  ('550e8400-e29b-41d4-a716-446655440314', NULL, 'BNPL Fees', '550e8400-e29b-41d4-a716-446655440301', now())
ON CONFLICT (id) DO NOTHING;

-- Operating Expenses - Marketing (parent category)
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440302', NULL, 'Marketing & Advertising', '550e8400-e29b-41d4-a716-446655440300', now())
ON CONFLICT (id) DO NOTHING;

-- Operating Expenses - Marketing (child categories)
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440321', NULL, 'Meta Ads', '550e8400-e29b-41d4-a716-446655440302', now()),
  ('550e8400-e29b-41d4-a716-446655440322', NULL, 'Google Ads', '550e8400-e29b-41d4-a716-446655440302', now()),
  ('550e8400-e29b-41d4-a716-446655440323', NULL, 'TikTok Ads', '550e8400-e29b-41d4-a716-446655440302', now()),
  ('550e8400-e29b-41d4-a716-446655440324', NULL, 'Other Ads', '550e8400-e29b-41d4-a716-446655440302', now())
ON CONFLICT (id) DO NOTHING;

-- Operating Expenses - Platform & Tools
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440331', NULL, 'Shopify Platform', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440332', NULL, 'App Subscriptions', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440333', NULL, 'Email/SMS Tools', '550e8400-e29b-41d4-a716-446655440300', now())
ON CONFLICT (id) DO NOTHING;

-- Operating Expenses - Fulfillment & Logistics
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440341', NULL, 'Fulfillment & 3PL Fees', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440342', NULL, 'Warehouse Storage', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440343', NULL, 'Shipping Expense', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440344', NULL, 'Returns Processing', '550e8400-e29b-41d4-a716-446655440300', now())
ON CONFLICT (id) DO NOTHING;

-- Operating Expenses - General Business
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440351', NULL, 'Software (General)', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440352', NULL, 'Professional Services', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440353', NULL, 'Rent & Utilities', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440354', NULL, 'Insurance', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440355', NULL, 'Payroll/Contractors', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440356', NULL, 'Office Supplies', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440357', NULL, 'Travel & Transportation', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440358', NULL, 'Bank Fees', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440359', NULL, 'Other Operating Expenses', '550e8400-e29b-41d4-a716-446655440300', now())
ON CONFLICT (id) DO NOTHING;

-- Taxes & Liabilities (not in P&L)
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440401', NULL, 'Sales Tax Payable', '550e8400-e29b-41d4-a716-446655440400', now()),
  ('550e8400-e29b-41d4-a716-446655440402', NULL, 'Duties & Import Taxes', '550e8400-e29b-41d4-a716-446655440300', now())
ON CONFLICT (id) DO NOTHING;

-- Clearing Accounts (not in P&L)
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440501', NULL, 'Shopify Payouts Clearing', '550e8400-e29b-41d4-a716-446655440500', now())
ON CONFLICT (id) DO NOTHING;

-- Post-MVP placeholders (hidden from prompt until later)
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440360', NULL, 'Amazon Fees', '550e8400-e29b-41d4-a716-446655440300', now()),
  ('550e8400-e29b-41d4-a716-446655440502', NULL, 'Amazon Payouts', '550e8400-e29b-41d4-a716-446655440500', now())
ON CONFLICT (id) DO NOTHING;

-- Create an index for faster lookups by name for global categories
CREATE INDEX IF NOT EXISTS idx_categories_global_name ON categories(name) WHERE org_id IS NULL;

-- Add org_id to decisions table to match the current schema constraint
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE decisions SET org_id = (SELECT org_id FROM transactions WHERE transactions.id = decisions.tx_id) WHERE org_id IS NULL;
ALTER TABLE decisions ALTER COLUMN org_id SET NOT NULL;

-- Update decisions table to support array rationale and add org_id FK if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE constraint_name = 'decisions_org_id_fkey'
    ) THEN
        ALTER TABLE decisions ADD CONSTRAINT decisions_org_id_fkey FOREIGN KEY (org_id) REFERENCES orgs(id);
    END IF;
END $$;