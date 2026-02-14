-- Migration to update default currency to XTZ and update comments for Tezos
-- This aligns with the transition to Tezos-only functionality

-- Update default values for currency columns
ALTER TABLE user_balances ALTER COLUMN currency SET DEFAULT 'XTZ';
ALTER TABLE balance_audit_log ALTER COLUMN currency SET DEFAULT 'XTZ';

-- Update table and column comments to reflect Tezos/XTZ
COMMENT ON TABLE user_balances IS 'Tracks XTZ balances for users in the Tezonomo house balance system';
COMMENT ON COLUMN user_balances.user_address IS 'Tezos wallet address (tz1...)';
COMMENT ON COLUMN user_balances.balance IS 'Current house balance in XTZ tokens (up to 8 decimal places)';

COMMENT ON TABLE balance_audit_log IS 'Audit log for all house balance operations in XTZ';
COMMENT ON COLUMN balance_audit_log.user_address IS 'Tezos wallet address (tz1...)';
COMMENT ON COLUMN balance_audit_log.amount IS 'Amount of XTZ involved in the operation';

-- Optional: If we want to clean up non-XTZ records (decide if safe)
-- DELETE FROM user_balances WHERE currency != 'XTZ';
-- DELETE FROM balance_audit_log WHERE currency != 'XTZ';
