-- Migration 008: Dashboard columns and indexes
-- Add current_balance_cents to accounts table and low_balance_threshold_cents to orgs table

-- Add current balance tracking to accounts
alter table accounts add column if not exists current_balance_cents text default '0';

-- Add low balance threshold to orgs (default to $1000.00)
alter table orgs add column if not exists low_balance_threshold_cents text default '100000';

-- Ensure we have proper indexes for dashboard queries
create index if not exists idx_accounts_org_id on accounts(org_id);
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_transactions_org_id on transactions(org_id);
create index if not exists idx_transactions_org_date on transactions(org_id, date);
create index if not exists idx_transactions_category_id on transactions(category_id);

-- Index for weekly aggregations (performance optimization)
create index if not exists idx_transactions_org_date_trunc_week on transactions(org_id, date_trunc('week', date));

-- Comments for clarity
comment on column accounts.current_balance_cents is 'Current account balance in cents as text to avoid precision issues';
comment on column orgs.low_balance_threshold_cents is 'Low balance alert threshold in cents as text, default $1000.00';