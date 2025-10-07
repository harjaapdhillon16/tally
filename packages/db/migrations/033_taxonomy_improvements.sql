-- 033_taxonomy_improvements.sql - Address taxonomy gaps identified in audit
-- Adds missing categories for FX fees and cryptocurrency fees
-- Adds documentation comments for collision-prone category boundaries
-- Based on taxonomy analysis from bench/taxonomy-analysis.json

-- ============================================================================
-- Add missing edge case categories
-- ============================================================================

-- FX/Currency Conversion Fees (OpEx - Payment Processing subcategory)
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440315', NULL, 'FX & Currency Conversion Fees', '550e8400-e29b-41d4-a716-446655440301', now())
ON CONFLICT (id) DO NOTHING;

-- Cryptocurrency Payment Fees (OpEx - Payment Processing subcategory)
INSERT INTO categories (id, org_id, name, parent_id, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440316', NULL, 'Cryptocurrency Payment Fees', '550e8400-e29b-41d4-a716-446655440301', now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Add metadata table for category disambiguation rules
-- ============================================================================

CREATE TABLE IF NOT EXISTS category_disambiguation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id_1 uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  category_id_2 uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  collision_risk text NOT NULL CHECK (collision_risk IN ('high', 'medium', 'low')),
  disambiguation_criteria jsonb NOT NULL,
  examples jsonb NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id_1, category_id_2)
);

COMMENT ON TABLE category_disambiguation_rules IS
  'Documents disambiguation criteria for categories with overlapping boundaries. ' ||
  'Used by categorization engine to resolve conflicts when multiple categories match.';

COMMENT ON COLUMN category_disambiguation_rules.disambiguation_criteria IS
  'JSON structure defining how to choose between conflicting categories. ' ||
  'Format: {"primary_signal": "keyword|vendor|mcc|amount", "threshold": value, "decision_tree": {...}}';

COMMENT ON COLUMN category_disambiguation_rules.examples IS
  'JSON array of example transactions that demonstrate the disambiguation logic. ' ||
  'Format: [{"description": "...", "merchant": "...", "chosen_category": "...", "reason": "..."}]';

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_disambiguation_rules_category1
  ON category_disambiguation_rules(category_id_1);
CREATE INDEX IF NOT EXISTS idx_disambiguation_rules_category2
  ON category_disambiguation_rules(category_id_2);

-- Enable RLS
ALTER TABLE category_disambiguation_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies (global rules visible to all, org-specific rules scoped)
CREATE POLICY "Global disambiguation rules visible to all users"
  ON category_disambiguation_rules
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- Seed disambiguation rules for high-risk collisions
-- ============================================================================

-- Rule 1: Shipping Expense vs Fulfillment 3PL Fees
DO $$
DECLARE
  shipping_expense_id uuid;
  fulfillment_3pl_id uuid;
BEGIN
  SELECT id INTO shipping_expense_id FROM categories WHERE name = 'Shipping Expense' AND org_id IS NULL;
  SELECT id INTO fulfillment_3pl_id FROM categories WHERE name = 'Fulfillment & 3PL Fees' AND org_id IS NULL;

  IF shipping_expense_id IS NOT NULL AND fulfillment_3pl_id IS NOT NULL THEN
    INSERT INTO category_disambiguation_rules (category_id_1, category_id_2, collision_risk, disambiguation_criteria, examples, notes)
    VALUES (
      shipping_expense_id,
      fulfillment_3pl_id,
      'high',
      jsonb_build_object(
        'primary_signal', 'vendor',
        'decision_tree', jsonb_build_object(
          'if_vendor_matches', jsonb_build_array('shipbob', 'shipmonk', 'deliverr', 'amazon fba'),
          'then_category', 'fulfillment_3pl_fees',
          'else_if_vendor_matches', jsonb_build_array('usps', 'fedex', 'ups', 'dhl'),
          'then_category', 'shipping_expense',
          'else_category', 'fulfillment_3pl_fees'
        )
      ),
      jsonb_build_array(
        jsonb_build_object('description', 'ShipBob monthly invoice', 'merchant', 'ShipBob', 'chosen_category', 'fulfillment_3pl_fees', 'reason', 'Vendor is known 3PL provider'),
        jsonb_build_object('description', 'USPS Priority Mail', 'merchant', 'USPS', 'chosen_category', 'shipping_expense', 'reason', 'Direct shipping carrier, not 3PL'),
        jsonb_build_object('description', 'FedEx pickup and pack', 'merchant', 'FedEx', 'chosen_category', 'shipping_expense', 'reason', 'FedEx is carrier, even with pack service')
      ),
      '3PL providers bundle warehousing + fulfillment + shipping. Direct carriers (USPS/FedEx/UPS) are pure shipping.'
    )
    ON CONFLICT (category_id_1, category_id_2) DO NOTHING;
  END IF;
END $$;

-- Rule 2: Returns Processing vs Refunds (Contra-Revenue)
DO $$
DECLARE
  returns_processing_id uuid;
  refunds_contra_id uuid;
BEGIN
  SELECT id INTO returns_processing_id FROM categories WHERE name = 'Returns Processing' AND org_id IS NULL;
  SELECT id INTO refunds_contra_id FROM categories WHERE name LIKE 'Refunds%Contra-Revenue%' AND org_id IS NULL;

  IF returns_processing_id IS NOT NULL AND refunds_contra_id IS NOT NULL THEN
    INSERT INTO category_disambiguation_rules (category_id_1, category_id_2, collision_risk, disambiguation_criteria, examples, notes)
    VALUES (
      returns_processing_id,
      refunds_contra_id,
      'high',
      jsonb_build_object(
        'primary_signal', 'amount',
        'decision_tree', jsonb_build_object(
          'if_amount_negative', 'refunds_contra',
          'if_description_contains', jsonb_build_array('refund', 'customer return', 'chargeback'),
          'then_category', 'refunds_contra',
          'else_if_description_contains', jsonb_build_array('restocking fee', 'return label', 'rma', 'processing fee'),
          'then_category', 'returns_processing',
          'else_category', 'refunds_contra'
        )
      ),
      jsonb_build_array(
        jsonb_build_object('description', 'Customer refund', 'amount', '-$50.00', 'chosen_category', 'refunds_contra', 'reason', 'Negative amount indicates refund to customer'),
        jsonb_build_object('description', 'Restocking fee', 'amount', '$5.00', 'chosen_category', 'returns_processing', 'reason', 'Positive fee for processing return'),
        jsonb_build_object('description', 'Return shipping label', 'merchant', 'USPS', 'chosen_category', 'returns_processing', 'reason', 'Cost to process return')
      ),
      'Returns have TWO components: (1) Refund to customer (contra-revenue, negative), (2) Processing cost (COGS, positive). Use amount sign and keywords to disambiguate.'
    )
    ON CONFLICT (category_id_1, category_id_2) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- Add category metadata for under-represented categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS category_metadata (
  category_id uuid PRIMARY KEY REFERENCES categories(id) ON DELETE CASCADE,
  is_under_represented boolean DEFAULT false,
  expected_monthly_txn_count int,
  active_learning_priority text CHECK (active_learning_priority IN ('high', 'medium', 'low', 'none')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE category_metadata IS
  'Metadata about categories for monitoring and active learning. ' ||
  'Tracks under-represented categories that need prioritization in labeling.';

CREATE INDEX IF NOT EXISTS idx_category_metadata_under_represented
  ON category_metadata(is_under_represented) WHERE is_under_represented = true;

-- Enable RLS
ALTER TABLE category_metadata ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Category metadata visible to all users"
  ON category_metadata
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed under-represented categories metadata
INSERT INTO category_metadata (category_id, is_under_represented, expected_monthly_txn_count, active_learning_priority, notes)
SELECT
  id,
  true,
  5,
  'high',
  'Under-represented category - prioritize for active learning if transaction count < 10/month'
FROM categories
WHERE org_id IS NULL
  AND name IN (
    'Duties & Import Taxes',
    'Returns Processing',
    'Warehouse Storage',
    'Amazon Fees',
    'Manufacturing Costs'
  )
ON CONFLICT (category_id) DO NOTHING;

-- ============================================================================
-- Add helpful comments to categories table for collision-prone categories
-- ============================================================================

COMMENT ON TABLE categories IS
  'Financial transaction categories for e-commerce businesses. ' ||
  'Includes parent buckets (Revenue, COGS, OpEx, Liabilities, Clearing) and leaf categories. ' ||
  'See category_disambiguation_rules table for handling overlapping boundaries.';

-- ============================================================================
-- Create view for category collision analysis
-- ============================================================================

CREATE OR REPLACE VIEW category_collisions_view AS
SELECT
  c1.id AS category_1_id,
  c1.name AS category_1_name,
  c1.type AS category_1_type,
  c2.id AS category_2_id,
  c2.name AS category_2_name,
  c2.type AS category_2_type,
  cdr.collision_risk,
  cdr.disambiguation_criteria,
  cdr.examples,
  cdr.notes
FROM category_disambiguation_rules cdr
JOIN categories c1 ON cdr.category_id_1 = c1.id
JOIN categories c2 ON cdr.category_id_2 = c2.id
WHERE c1.org_id IS NULL AND c2.org_id IS NULL
ORDER BY
  CASE collision_risk
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END,
  c1.name,
  c2.name;

COMMENT ON VIEW category_collisions_view IS
  'Human-readable view of category collision risks with disambiguation rules. ' ||
  'Used for documentation and validation of categorization logic.';

-- Grant read access to authenticated users
GRANT SELECT ON category_collisions_view TO authenticated;
