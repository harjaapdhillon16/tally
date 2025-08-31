-- 011_receipts_reconciliation.sql - Reconcile receipts table conflicts
-- Fixes conflicts between 001_init.sql and 009_review_optimization.sql
-- Ensures proper receipt functionality for Milestone 5

-- Check if we need to add missing columns to existing receipts table
DO $$
DECLARE
    receipt_table_exists boolean;
    has_uploaded_by boolean;
    has_original_filename boolean;
    has_file_type boolean;
    has_file_size boolean;
    has_processing_status boolean;
    has_updated_at boolean;
    has_ocr_data boolean;
    has_old_ocr_text boolean;
BEGIN
    -- Check if receipts table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'receipts'
    ) INTO receipt_table_exists;

    IF receipt_table_exists THEN
        -- Check for specific columns
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'receipts' AND column_name = 'uploaded_by'
        ) INTO has_uploaded_by;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'receipts' AND column_name = 'original_filename'
        ) INTO has_original_filename;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'receipts' AND column_name = 'file_type'
        ) INTO has_file_type;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'receipts' AND column_name = 'file_size'
        ) INTO has_file_size;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'receipts' AND column_name = 'processing_status'
        ) INTO has_processing_status;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'receipts' AND column_name = 'updated_at'
        ) INTO has_updated_at;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'receipts' AND column_name = 'ocr_data'
        ) INTO has_ocr_data;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'receipts' AND column_name = 'ocr_text'
        ) INTO has_old_ocr_text;

        -- Add missing columns
        IF NOT has_uploaded_by THEN
            ALTER TABLE receipts ADD COLUMN uploaded_by uuid REFERENCES auth.users(id);
            RAISE NOTICE 'Added uploaded_by column to receipts table';
        END IF;
        
        IF NOT has_original_filename THEN
            ALTER TABLE receipts ADD COLUMN original_filename text;
            RAISE NOTICE 'Added original_filename column to receipts table';
        END IF;
        
        IF NOT has_file_type THEN
            ALTER TABLE receipts ADD COLUMN file_type text;
            RAISE NOTICE 'Added file_type column to receipts table';
        END IF;
        
        IF NOT has_file_size THEN
            ALTER TABLE receipts ADD COLUMN file_size integer;
            RAISE NOTICE 'Added file_size column to receipts table';
        END IF;
        
        IF NOT has_processing_status THEN
            ALTER TABLE receipts ADD COLUMN processing_status text DEFAULT 'pending' 
                CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));
            RAISE NOTICE 'Added processing_status column to receipts table';
        END IF;
        
        IF NOT has_updated_at THEN
            ALTER TABLE receipts ADD COLUMN updated_at timestamptz DEFAULT now();
            RAISE NOTICE 'Added updated_at column to receipts table';
        END IF;

        -- Handle OCR data migration
        IF has_old_ocr_text AND NOT has_ocr_data THEN
            -- Migrate from old ocr_text to new ocr_data format
            ALTER TABLE receipts ADD COLUMN ocr_data jsonb;
            
            -- Convert existing ocr_text to jsonb format
            UPDATE receipts 
            SET ocr_data = jsonb_build_object('text', ocr_text, 'migrated', true)
            WHERE ocr_text IS NOT NULL;
            
            RAISE NOTICE 'Migrated ocr_text to ocr_data column';
        ELSIF NOT has_ocr_data THEN
            ALTER TABLE receipts ADD COLUMN ocr_data jsonb;
            RAISE NOTICE 'Added ocr_data column to receipts table';
        END IF;

        -- Update NOT NULL constraints for required columns where safe
        -- Only add NOT NULL for new receipts going forward
        IF has_uploaded_by THEN
            -- Don't add NOT NULL constraint to existing data, just ensure it's set for new inserts
            ALTER TABLE receipts ALTER COLUMN uploaded_by SET DEFAULT auth.uid();
        END IF;

    ELSE
        -- Table doesn't exist, create it with full schema
        CREATE TABLE receipts (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
            uploaded_by uuid NOT NULL REFERENCES auth.users(id),
            storage_path text NOT NULL,
            original_filename text NOT NULL,
            file_type text NOT NULL,
            file_size integer NOT NULL,
            processing_status text NOT NULL DEFAULT 'pending' 
                CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
            ocr_data jsonb,
            vendor text, -- Keep for backward compatibility
            total_cents bigint, -- Keep for backward compatibility
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        );
        RAISE NOTICE 'Created receipts table with full schema';
    END IF;

END $$;

-- Ensure transaction_receipts junction table exists
CREATE TABLE IF NOT EXISTS transaction_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    attached_by uuid NOT NULL REFERENCES auth.users(id),
    attached_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(transaction_id, receipt_id)
);

-- Enable RLS on receipts tables if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'receipts' AND rowsecurity = true
    ) THEN
        ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on receipts table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'transaction_receipts' AND rowsecurity = true
    ) THEN
        ALTER TABLE transaction_receipts ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on transaction_receipts table';
    END IF;
END $$;

-- Create or update indexes for receipts functionality
CREATE INDEX IF NOT EXISTS receipts_org_id_idx ON receipts(org_id);
CREATE INDEX IF NOT EXISTS receipts_uploaded_by_idx ON receipts(uploaded_by);
CREATE INDEX IF NOT EXISTS receipts_created_at_idx ON receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS receipts_processing_status_idx ON receipts(processing_status) 
    WHERE processing_status != 'completed';

-- Indexes for transaction_receipts junction table
CREATE INDEX IF NOT EXISTS transaction_receipts_tx_idx ON transaction_receipts(transaction_id);
CREATE INDEX IF NOT EXISTS transaction_receipts_receipt_idx ON transaction_receipts(receipt_id);
CREATE INDEX IF NOT EXISTS transaction_receipts_attached_by_idx ON transaction_receipts(attached_by);

-- Create RLS policies for receipts
DO $$
BEGIN
    -- Receipts policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'receipts' AND policyname = 'receipts_select_member'
    ) THEN
        CREATE POLICY "receipts_select_member" ON receipts
            FOR SELECT USING (public.user_in_org(org_id) = true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'receipts' AND policyname = 'receipts_insert_member'
    ) THEN
        CREATE POLICY "receipts_insert_member" ON receipts
            FOR INSERT WITH CHECK (public.user_in_org(org_id) = true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'receipts' AND policyname = 'receipts_update_member'
    ) THEN
        CREATE POLICY "receipts_update_member" ON receipts
            FOR UPDATE USING (public.user_in_org(org_id) = true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'receipts' AND policyname = 'receipts_delete_member'
    ) THEN
        CREATE POLICY "receipts_delete_member" ON receipts
            FOR DELETE USING (public.user_in_org(org_id) = true);
    END IF;

    -- Transaction receipts policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transaction_receipts' AND policyname = 'transaction_receipts_select_member'
    ) THEN
        CREATE POLICY "transaction_receipts_select_member" ON transaction_receipts
            FOR SELECT USING (
                transaction_id IN (
                    SELECT id FROM transactions WHERE public.user_in_org(org_id) = true
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transaction_receipts' AND policyname = 'transaction_receipts_insert_member'
    ) THEN
        CREATE POLICY "transaction_receipts_insert_member" ON transaction_receipts
            FOR INSERT WITH CHECK (
                transaction_id IN (
                    SELECT id FROM transactions WHERE public.user_in_org(org_id) = true
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transaction_receipts' AND policyname = 'transaction_receipts_update_member'
    ) THEN
        CREATE POLICY "transaction_receipts_update_member" ON transaction_receipts
            FOR UPDATE USING (
                transaction_id IN (
                    SELECT id FROM transactions WHERE public.user_in_org(org_id) = true
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transaction_receipts' AND policyname = 'transaction_receipts_delete_member'
    ) THEN
        CREATE POLICY "transaction_receipts_delete_member" ON transaction_receipts
            FOR DELETE USING (
                transaction_id IN (
                    SELECT id FROM transactions WHERE public.user_in_org(org_id) = true
                )
            );
    END IF;

END $$;

-- Add helpful comments
COMMENT ON TABLE receipts IS 
'Receipt storage and OCR data. Supports both legacy schema from 001_init and enhanced schema from 009_review_optimization.';

COMMENT ON TABLE transaction_receipts IS 
'Junction table for M:N relationship between transactions and receipts. Allows multiple receipts per transaction.';

COMMENT ON COLUMN receipts.ocr_data IS 
'OCR results in JSONB format. Migrated from legacy ocr_text column if it existed.';

COMMENT ON COLUMN receipts.processing_status IS 
'Receipt processing status: pending (uploaded), processing (OCR in progress), completed (OCR done), failed (OCR error).';

-- Update any existing receipt_id foreign key references in transactions table
-- This should be handled carefully as it might affect existing data
DO $$
DECLARE
    has_receipt_id_fk boolean;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'receipt_id'
    ) INTO has_receipt_id_fk;

    IF has_receipt_id_fk THEN
        -- Add comment explaining migration to junction table
        COMMENT ON COLUMN transactions.receipt_id IS 
        'Legacy single receipt reference. New receipts should use transaction_receipts junction table for M:N relationship.';
        
        RAISE NOTICE 'Found legacy receipt_id column in transactions table. Consider migrating to transaction_receipts junction table.';
    END IF;
END $$;
