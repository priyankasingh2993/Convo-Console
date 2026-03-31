-- Seed for local webhook + WS test. Run once:
--   npm run seed:local
-- (from repo root)

INSERT OR IGNORE INTO organizations (id, industry, goal, team_size, tool, trial_start_date, plan)
VALUES ('test-org', 'other', 'all', 'solo', 'none', datetime('now'), 'trial');

INSERT OR IGNORE INTO waba_numbers (id, org_id, phone_number, waba_id, access_token_enc, webhook_verify_token)
VALUES ('test-waba', 'test-org', '919999999999', 'waba1', 'enc', 'my-verify-token');
