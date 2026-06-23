-- Accounting is in USD for configurable metered providers; local inference has unknown host cost.
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS model_name text;
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS cost_usd numeric(18,8) NOT NULL DEFAULT 0 CHECK(cost_usd>=0);
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS reserved_cost_usd numeric(18,8) NOT NULL DEFAULT 0 CHECK(reserved_cost_usd>=0);
ALTER TABLE tenant_budgets ADD COLUMN IF NOT EXISTS daily_cost_limit_usd numeric(12,2) NOT NULL DEFAULT 1000
 CHECK(daily_cost_limit_usd>=0);
CREATE INDEX IF NOT EXISTS usage_tenant_answer_day_idx ON usage_events(tenant_id,created_at)
 WHERE category='answer';
