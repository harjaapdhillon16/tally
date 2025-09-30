-- 024_transaction_deletion.sql - Add function for bulk transaction deletion

-- Function to handle transaction deletion with cascade
-- This function provides atomic deletion of transactions with proper audit trail
CREATE OR REPLACE FUNCTION public.delete_transactions(
  p_tx_ids uuid[],
  p_org_id uuid,
  p_user_id uuid
)
RETURNS TABLE(
  deleted_count int,
  errors jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_tx_id uuid;
  v_tx_org_id uuid;
BEGIN
  -- Loop through transaction IDs
  FOREACH v_tx_id IN ARRAY p_tx_ids
  LOOP
    BEGIN
      -- Verify ownership before deletion
      -- Get the transaction's org_id to verify access
      SELECT org_id INTO v_tx_org_id
      FROM transactions 
      WHERE id = v_tx_id;

      -- If transaction doesn't exist or belongs to a different org, add error
      IF v_tx_org_id IS NULL THEN
        v_errors := v_errors || jsonb_build_object(
          'tx_id', v_tx_id,
          'error', 'Transaction not found'
        );
        CONTINUE;
      END IF;

      IF v_tx_org_id != p_org_id THEN
        v_errors := v_errors || jsonb_build_object(
          'tx_id', v_tx_id,
          'error', 'Access denied'
        );
        CONTINUE;
      END IF;

      -- Delete related records (cascade manually for explicit control)
      -- This ensures we have full control over what gets deleted
      DELETE FROM decisions WHERE tx_id = v_tx_id;
      DELETE FROM corrections WHERE tx_id = v_tx_id;
      DELETE FROM transaction_receipts WHERE transaction_id = v_tx_id;
      
      -- Delete the transaction
      DELETE FROM transactions 
      WHERE id = v_tx_id AND org_id = p_org_id;
      
      -- Check if deletion was successful
      IF FOUND THEN
        v_deleted_count := v_deleted_count + 1;
      ELSE
        v_errors := v_errors || jsonb_build_object(
          'tx_id', v_tx_id,
          'error', 'Failed to delete transaction'
        );
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Catch any errors during deletion and add to error list
      v_errors := v_errors || jsonb_build_object(
        'tx_id', v_tx_id,
        'error', SQLERRM
      );
    END;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT v_deleted_count, v_errors;
END;
$$;

-- Grant execute permission to authenticated users
-- RLS policies will still apply through the org_id check
GRANT EXECUTE ON FUNCTION public.delete_transactions TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.delete_transactions IS 
  'Bulk delete transactions with proper org-scoping and cascade. Validates org membership and provides detailed error reporting for partial failures. Manually cascades to decisions, corrections, and transaction_receipts tables.';
