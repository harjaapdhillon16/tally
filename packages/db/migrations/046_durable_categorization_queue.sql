-- Migration 046: Durable Categorization Queue and Rate Limiting
-- Adds persistent queue for transaction categorization and shared rate limit tracking

-- ============================================================================
-- Transaction Categorization Queue
-- ============================================================================
-- This table provides a durable queue for transactions that need categorization.
-- It enables reliable processing with retry logic and prevents duplicate work.

CREATE TABLE IF NOT EXISTS tx_categorization_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('new', 'claiming', 'processing', 'done', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient queue operations
CREATE INDEX IF NOT EXISTS idx_tx_categorization_queue_status_next_attempt 
  ON tx_categorization_queue (status, next_attempt_at) 
  WHERE status IN ('new', 'claiming');

CREATE INDEX IF NOT EXISTS idx_tx_categorization_queue_org_status 
  ON tx_categorization_queue (org_id, status);

CREATE INDEX IF NOT EXISTS idx_tx_categorization_queue_tx_id 
  ON tx_categorization_queue (tx_id);

-- Add comment for documentation
COMMENT ON TABLE tx_categorization_queue IS 
'Durable queue for transaction categorization. Enables reliable background processing with retry logic and prevents duplicate work.';

COMMENT ON COLUMN tx_categorization_queue.status IS 
'Queue item status: new (ready to process), claiming (being claimed by worker), processing (actively being processed), done (completed), failed (max retries exceeded)';

COMMENT ON COLUMN tx_categorization_queue.attempts IS 
'Number of processing attempts. Used for exponential backoff and max retry logic.';

COMMENT ON COLUMN tx_categorization_queue.next_attempt_at IS 
'Timestamp when this item is eligible for processing. Used for exponential backoff on retries.';

-- ============================================================================
-- API Rate Limit Tracking
-- ============================================================================
-- This table provides shared rate limit tracking across edge function invocations.
-- It implements a token bucket algorithm for API rate limiting.

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key text PRIMARY KEY,  -- e.g., 'gemini', 'openai'
  window_started_at timestamptz NOT NULL,
  tokens_remaining int NOT NULL,
  capacity int NOT NULL,
  refill_ms int NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Initialize Gemini rate limit (15 requests per minute)
INSERT INTO api_rate_limits (key, window_started_at, tokens_remaining, capacity, refill_ms)
VALUES ('gemini', now(), 15, 15, 60000)
ON CONFLICT (key) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE api_rate_limits IS 
'Shared rate limit tracking for external APIs. Implements token bucket algorithm to coordinate rate limiting across multiple edge function invocations.';

COMMENT ON COLUMN api_rate_limits.key IS 
'Unique identifier for the API being rate limited (e.g., gemini, openai)';

COMMENT ON COLUMN api_rate_limits.window_started_at IS 
'Timestamp when the current rate limit window started';

COMMENT ON COLUMN api_rate_limits.tokens_remaining IS 
'Number of API calls remaining in the current window';

COMMENT ON COLUMN api_rate_limits.capacity IS 
'Maximum number of API calls allowed per window';

COMMENT ON COLUMN api_rate_limits.refill_ms IS 
'Duration of the rate limit window in milliseconds';

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to claim queue items for processing (with SKIP LOCKED for concurrency)
CREATE OR REPLACE FUNCTION claim_categorization_queue_items(
  p_limit int DEFAULT 10,
  p_org_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  tx_id uuid,
  org_id uuid,
  attempts int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE tx_categorization_queue
  SET 
    status = 'processing',
    updated_at = now()
  WHERE tx_categorization_queue.id IN (
    SELECT q.id
    FROM tx_categorization_queue q
    WHERE q.status = 'new'
      AND q.next_attempt_at <= now()
      AND (p_org_id IS NULL OR q.org_id = p_org_id)
    ORDER BY q.next_attempt_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    tx_categorization_queue.id,
    tx_categorization_queue.tx_id,
    tx_categorization_queue.org_id,
    tx_categorization_queue.attempts;
END;
$$;

COMMENT ON FUNCTION claim_categorization_queue_items IS 
'Claims queue items for processing using SKIP LOCKED to prevent race conditions. Returns claimed items.';

-- Function to mark queue item as done
CREATE OR REPLACE FUNCTION complete_categorization_queue_item(
  p_queue_id uuid
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE tx_categorization_queue
  SET 
    status = 'done',
    updated_at = now()
  WHERE id = p_queue_id;
$$;

COMMENT ON FUNCTION complete_categorization_queue_item IS 
'Marks a queue item as successfully completed.';

-- Function to mark queue item as failed with retry
CREATE OR REPLACE FUNCTION fail_categorization_queue_item(
  p_queue_id uuid,
  p_error text,
  p_max_attempts int DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_attempts int;
  v_next_attempt timestamptz;
BEGIN
  -- Get current attempts
  SELECT attempts INTO v_attempts
  FROM tx_categorization_queue
  WHERE id = p_queue_id;
  
  -- Increment attempts
  v_attempts := v_attempts + 1;
  
  -- Calculate next attempt time with exponential backoff
  -- 1st retry: 1 min, 2nd: 2 min, 3rd: 4 min, 4th: 8 min, 5th: 16 min
  v_next_attempt := now() + (POWER(2, v_attempts - 1) * interval '1 minute');
  
  -- Update queue item
  IF v_attempts >= p_max_attempts THEN
    -- Max retries exceeded, mark as failed
    UPDATE tx_categorization_queue
    SET 
      status = 'failed',
      attempts = v_attempts,
      last_error = p_error,
      updated_at = now()
    WHERE id = p_queue_id;
  ELSE
    -- Retry with exponential backoff
    UPDATE tx_categorization_queue
    SET 
      status = 'new',
      attempts = v_attempts,
      next_attempt_at = v_next_attempt,
      last_error = p_error,
      updated_at = now()
    WHERE id = p_queue_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION fail_categorization_queue_item IS 
'Marks a queue item as failed and schedules retry with exponential backoff. After max attempts, marks as permanently failed.';

-- Function to check and consume rate limit token
CREATE OR REPLACE FUNCTION consume_rate_limit_token(
  p_key text,
  p_capacity int DEFAULT 15,
  p_refill_ms int DEFAULT 60000
)
RETURNS TABLE (
  allowed boolean,
  tokens_remaining int,
  retry_after_ms int
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_window_started timestamptz;
  v_tokens int;
  v_now timestamptz := now();
  v_window_elapsed_ms bigint;
BEGIN
  -- Get or create rate limit entry
  INSERT INTO api_rate_limits (key, window_started_at, tokens_remaining, capacity, refill_ms)
  VALUES (p_key, v_now, p_capacity, p_capacity, p_refill_ms)
  ON CONFLICT (key) DO NOTHING;
  
  -- Lock row for update
  SELECT window_started_at, tokens_remaining
  INTO v_window_started, v_tokens
  FROM api_rate_limits
  WHERE key = p_key
  FOR UPDATE;
  
  -- Calculate elapsed time in current window
  v_window_elapsed_ms := EXTRACT(EPOCH FROM (v_now - v_window_started)) * 1000;
  
  -- Check if window has expired, reset if so
  IF v_window_elapsed_ms >= p_refill_ms THEN
    v_window_started := v_now;
    v_tokens := p_capacity;
    v_window_elapsed_ms := 0;
    
    UPDATE api_rate_limits
    SET 
      window_started_at = v_window_started,
      tokens_remaining = v_tokens,
      updated_at = v_now
    WHERE key = p_key;
  END IF;
  
  -- Check if token available
  IF v_tokens > 0 THEN
    -- Consume token
    UPDATE api_rate_limits
    SET 
      tokens_remaining = tokens_remaining - 1,
      updated_at = v_now
    WHERE key = p_key;
    
    RETURN QUERY SELECT true, v_tokens - 1, 0;
  ELSE
    -- No tokens available, return retry time
    RETURN QUERY SELECT false, 0, (p_refill_ms - v_window_elapsed_ms::int);
  END IF;
END;
$$;

COMMENT ON FUNCTION consume_rate_limit_token IS 
'Attempts to consume a rate limit token. Returns whether allowed, remaining tokens, and retry time if rate limited.';

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE tx_categorization_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access to tx_categorization_queue"
  ON tx_categorization_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to api_rate_limits"
  ON api_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their org's queue items
CREATE POLICY "Users can view their org's queue items"
  ON tx_categorization_queue
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id 
      FROM org_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON tx_categorization_queue TO service_role;
GRANT SELECT ON tx_categorization_queue TO authenticated;

GRANT ALL ON api_rate_limits TO service_role;

GRANT EXECUTE ON FUNCTION claim_categorization_queue_items TO service_role;
GRANT EXECUTE ON FUNCTION complete_categorization_queue_item TO service_role;
GRANT EXECUTE ON FUNCTION fail_categorization_queue_item TO service_role;
GRANT EXECUTE ON FUNCTION consume_rate_limit_token TO service_role;

