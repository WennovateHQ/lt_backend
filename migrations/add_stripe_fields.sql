-- Add Stripe fields to users and escrow_accounts tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;
ALTER TABLE escrow_accounts ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
