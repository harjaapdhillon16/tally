-- 006_categorization_v0.sql - Schema for hybrid categorization engine
-- Adds decision audit, corrections tracking, and embeddings support

-- Add needs_review flag to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;

-- Create decisions audit table to track all categorization decisions
CREATE TABLE IF NOT EXISTS decisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    source text NOT NULL CHECK (source IN ('pass1','llm')),
    confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    rationale jsonb NOT NULL,
    decided_by text NOT NULL DEFAULT 'system',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create corrections table to track manual category fixes
CREATE TABLE IF NOT EXISTS corrections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    tx_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    old_category_id uuid REFERENCES categories(id),
    new_category_id uuid NOT NULL REFERENCES categories(id),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vendor embeddings table for semantic similarity matching
-- Using text-embedding-3-small (1536 dimensions)
CREATE TABLE IF NOT EXISTS vendor_embeddings (
    org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    vendor text NOT NULL,
    embedding vector(1536) NOT NULL,
    last_refreshed timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, vendor)
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_needs_review ON transactions(org_id, needs_review) WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_decisions_tx ON decisions(tx_id);
CREATE INDEX IF NOT EXISTS idx_decisions_source ON decisions(source);
CREATE INDEX IF NOT EXISTS idx_corrections_org ON corrections(org_id);
CREATE INDEX IF NOT EXISTS idx_corrections_tx ON corrections(tx_id);
CREATE INDEX IF NOT EXISTS idx_corrections_user ON corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_embeddings_org ON vendor_embeddings(org_id);

-- Enable RLS on new tables
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_embeddings ENABLE ROW LEVEL SECURITY;