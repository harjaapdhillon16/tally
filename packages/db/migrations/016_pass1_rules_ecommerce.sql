-- 016_pass1_rules_ecommerce.sql - Pass-1 rules for e-commerce categorization
-- Seeds vendor/keyword/MCC rules for automatic e-commerce transaction categorization

-- Delete existing rules to replace with e-commerce focused rules
DELETE FROM rules WHERE org_id IS NULL;

-- Platform & Payment Processing Rules
INSERT INTO rules (id, org_id, pattern, category_id, weight, created_at) VALUES
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["shopify"], "type": "vendor"}', '550e8400-e29b-41d4-a716-446655440331', 0.9, now()),
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["stripe"], "type": "vendor"}', '550e8400-e29b-41d4-a716-446655440311', 0.9, now()),
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["paypal"], "type": "vendor"}', '550e8400-e29b-41d4-a716-446655440312', 0.9, now()),
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["shop pay", "shop-pay"], "type": "vendor"}', '550e8400-e29b-41d4-a716-446655440313', 0.9, now()),
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["afterpay", "affirm", "klarna", "sezzle"], "type": "vendor"}', '550e8400-e29b-41d4-a716-446655440314', 0.9, now())
ON CONFLICT (id) DO NOTHING;

-- Advertising & Marketing Rules
INSERT INTO rules (id, org_id, pattern, category_id, weight, created_at) VALUES
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["facebook", "meta", "instagram"], "description_keywords": ["ads", "advertising"], "type": "vendor_and_description"}', '550e8400-e29b-41d4-a716-446655440321', 0.9, now()),
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["google"], "description_keywords": ["ads", "advertising", "adwords"], "type": "vendor_and_description"}', '550e8400-e29b-41d4-a716-446655440322', 0.9, now()),
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["tiktok"], "description_keywords": ["ads", "advertising"], "type": "vendor_and_description"}', '550e8400-e29b-41d4-a716-446655440323', 0.9, now()),
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["pinterest", "snapchat", "twitter", "linkedin"], "description_keywords": ["ads", "advertising"], "type": "vendor_and_description"}', '550e8400-e29b-41d4-a716-446655440324', 0.85, now())
ON CONFLICT (id) DO NOTHING;

-- Shipping & Logistics Rules
INSERT INTO rules (id, org_id, pattern, category_id, weight, created_at) VALUES
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["usps", "ups", "fedex", "dhl"], "type": "vendor"}', '550e8400-e29b-41d4-a716-446655440343', 0.9, now()),
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["shipstation", "shippo", "easypost"], "type": "vendor"}', '550e8400-e29b-41d4-a716-446655440343', 0.9, now()),
  (gen_random_uuid(), NULL, '{"description_keywords": ["shipping", "postage", "freight"], "type": "description"}', '550e8400-e29b-41d4-a716-446655440343', 0.75, now())
ON CONFLICT (id) DO NOTHING;

-- Fulfillment & 3PL Rules
INSERT INTO rules (id, org_id, pattern, category_id, weight, created_at) VALUES
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["amazon fba", "fulfillment by amazon"], "type": "vendor"}', '550e8400-e29b-41d4-a716-446655440341', 0.9, now()),
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["shipbob", "red stag", "whiplash", "shipmonk"], "type": "vendor"}', '550e8400-e29b-41d4-a716-446655440341', 0.9, now()),
  (gen_random_uuid(), NULL, '{"description_keywords": ["fulfillment", "3pl", "warehouse"], "type": "description"}', '550e8400-e29b-41d4-a716-446655440341', 0.8, now())
ON CONFLICT (id) DO NOTHING;

-- Email/SMS Marketing Tools
INSERT INTO rules (id, org_id, pattern, category_id, weight, created_at) VALUES
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["klaviyo", "mailchimp", "constant contact"], "type": "vendor"}', '550e8400-e29b-41d4-a716-446655440333', 0.9, now()),
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["attentive", "postscript", "smsbump"], "type": "vendor"}', '550e8400-e29b-41d4-a716-446655440333', 0.9, now())
ON CONFLICT (id) DO NOTHING;

-- Inventory & Manufacturing Rules
INSERT INTO rules (id, org_id, pattern, category_id, weight, created_at) VALUES
  (gen_random_uuid(), NULL, '{"description_keywords": ["inventory", "wholesale", "supplier"], "type": "description"}', '550e8400-e29b-41d4-a716-446655440201', 0.8, now()),
  (gen_random_uuid(), NULL, '{"description_keywords": ["manufacturing", "production", "factory"], "type": "description"}', '550e8400-e29b-41d4-a716-446655440204', 0.8, now()),
  (gen_random_uuid(), NULL, '{"description_keywords": ["packaging", "boxes", "mailers"], "type": "description"}', '550e8400-e29b-41d4-a716-446655440203', 0.8, now())
ON CONFLICT (id) DO NOTHING;

-- Shopify Payouts Clearing (Special case for Plaid deposits)
INSERT INTO rules (id, org_id, pattern, category_id, weight, created_at) VALUES
  (gen_random_uuid(), NULL, '{"vendor_keywords": ["shopify"], "description_keywords": ["payout", "transfer", "deposit"], "type": "shopify_payout"}', '550e8400-e29b-41d4-a716-446655440501', 1.0, now())
ON CONFLICT (id) DO NOTHING;

-- MCC (Merchant Category Code) mappings for e-commerce
INSERT INTO rules (id, org_id, pattern, category_id, weight, created_at) VALUES
  -- Computer Software Stores
  (gen_random_uuid(), NULL, '{"mcc": "5734", "type": "mcc"}', '550e8400-e29b-41d4-a716-446655440332', 0.85, now()),
  -- Business Services
  (gen_random_uuid(), NULL, '{"mcc": "7399", "type": "mcc"}', '550e8400-e29b-41d4-a716-446655440352', 0.8, now()),
  -- Advertising Services
  (gen_random_uuid(), NULL, '{"mcc": "7311", "type": "mcc"}', '550e8400-e29b-41d4-a716-446655440302', 0.85, now()),
  -- Courier Services
  (gen_random_uuid(), NULL, '{"mcc": "4215", "type": "mcc"}', '550e8400-e29b-41d4-a716-446655440343', 0.9, now()),
  -- Postal Services
  (gen_random_uuid(), NULL, '{"mcc": "9402", "type": "mcc"}', '550e8400-e29b-41d4-a716-446655440343', 0.9, now()),
  -- Package Stores
  (gen_random_uuid(), NULL, '{"mcc": "5921", "type": "mcc"}', '550e8400-e29b-41d4-a716-446655440203', 0.8, now())
ON CONFLICT (id) DO NOTHING;

-- General business expense patterns
INSERT INTO rules (id, org_id, pattern, category_id, weight, created_at) VALUES
  (gen_random_uuid(), NULL, '{"description_keywords": ["rent", "lease"], "type": "description"}', '550e8400-e29b-41d4-a716-446655440353', 0.85, now()),
  (gen_random_uuid(), NULL, '{"description_keywords": ["insurance"], "type": "description"}', '550e8400-e29b-41d4-a716-446655440354', 0.85, now()),
  (gen_random_uuid(), NULL, '{"description_keywords": ["bank fee", "service charge"], "type": "description"}', '550e8400-e29b-41d4-a716-446655440358', 0.9, now()),
  (gen_random_uuid(), NULL, '{"description_keywords": ["office supplies", "stationery"], "type": "description"}', '550e8400-e29b-41d4-a716-446655440356', 0.8, now()),
  (gen_random_uuid(), NULL, '{"description_keywords": ["travel", "hotel", "flight", "uber", "lyft"], "type": "description"}', '550e8400-e29b-41d4-a716-446655440357', 0.8, now())
ON CONFLICT (id) DO NOTHING;

-- Enable extensions needed for indexing
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add index for faster rule matching on pattern
CREATE INDEX IF NOT EXISTS idx_rules_pattern_type ON rules USING GIN ((pattern->>'type') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_rules_vendor_keywords ON rules USING GIN ((pattern->'vendor_keywords') jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_rules_description_keywords ON rules USING GIN ((pattern->'description_keywords') jsonb_path_ops);