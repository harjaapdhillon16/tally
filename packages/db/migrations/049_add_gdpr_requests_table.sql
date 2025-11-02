-- 049_add_gdpr_requests_table.sql
-- Add table to track GDPR compliance requests from Shopify
-- Required for audit trail and compliance verification

CREATE TABLE IF NOT EXISTS gdpr_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
    shop_domain text NOT NULL,
    request_type text NOT NULL CHECK (request_type IN ('data_request', 'customer_redact', 'shop_redact')),
    customer_email text NULL,
    customer_id text NULL,
    data_provided jsonb NULL,
    processed_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Index for audit queries
CREATE INDEX idx_gdpr_requests_org_id ON gdpr_requests(org_id);
CREATE INDEX idx_gdpr_requests_shop_domain ON gdpr_requests(shop_domain);
CREATE INDEX idx_gdpr_requests_type ON gdpr_requests(request_type);
CREATE INDEX idx_gdpr_requests_processed_at ON gdpr_requests(processed_at);

-- RLS policies (service role only for GDPR requests)
ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gdpr_requests_select_member" ON gdpr_requests
    FOR SELECT USING (public.user_in_org(org_id) = true);

-- Only service role can insert (webhooks)
REVOKE INSERT ON gdpr_requests FROM authenticated;

-- Add comments for documentation
COMMENT ON TABLE gdpr_requests IS 'Tracks GDPR compliance requests from Shopify webhooks (data requests, customer redaction, shop redaction)';
COMMENT ON COLUMN gdpr_requests.request_type IS 'Type of GDPR request: data_request (access), customer_redact (erasure), shop_redact (uninstall)';
COMMENT ON COLUMN gdpr_requests.data_provided IS 'JSON payload with details of what data was provided or redacted';
COMMENT ON COLUMN gdpr_requests.processed_at IS 'When the request was processed (for 30-day/48-hour compliance tracking)';




