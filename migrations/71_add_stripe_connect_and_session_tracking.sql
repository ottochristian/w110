-- Migration 71: Add Stripe Connect per-club accounts + order session tracking
-- Enables each club to connect their own Stripe account
-- Stores Stripe session ID on orders for reliable payment verification

-- Add Stripe Connect fields to clubs
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT NOT NULL DEFAULT 'not_connected'
    CHECK (stripe_connect_status IN ('not_connected', 'pending', 'active', 'restricted')),
  ADD COLUMN IF NOT EXISTS stripe_onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_application_fee_percent NUMERIC(5,2) DEFAULT 0
    CHECK (stripe_application_fee_percent >= 0 AND stripe_application_fee_percent <= 100);

-- Add session ID to orders so verify-payment can look up directly
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT UNIQUE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clubs_stripe_account_id ON clubs(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

COMMENT ON COLUMN clubs.stripe_account_id IS 'Stripe Connect Express account ID (acct_xxx) for this club';
COMMENT ON COLUMN clubs.stripe_connect_status IS 'Status of Stripe Connect onboarding: not_connected, pending, active, restricted';
COMMENT ON COLUMN clubs.stripe_application_fee_percent IS 'Platform fee % taken from each payment (0 = no fee)';
COMMENT ON COLUMN orders.stripe_session_id IS 'Stripe Checkout Session ID stored immediately on creation for reliable payment verification';
