-- Convo D1 schema — copy of web/src/lib/db/schema.sql for wrangler migrations
-- Run from repo root: npx wrangler d1 execute convo-production --local --file=schema.sql

-- 1. organizations (Clerk org + onboarding answers)
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  industry TEXT NOT NULL,
  goal TEXT NOT NULL,
  team_size TEXT NOT NULL,
  tool TEXT NOT NULL,
  switcher_tool TEXT,
  owner_phone TEXT,
  trial_start_date TEXT NOT NULL,
  plan TEXT DEFAULT 'trial',
  plan_period TEXT,
  plan_expires_at TEXT,
  plan_activated_at TEXT,
  fas_score_cache INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 2. waba_numbers (WhatsApp Business Account numbers)
CREATE TABLE IF NOT EXISTS waba_numbers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  phone_number TEXT NOT NULL,
  display_name TEXT,
  waba_id TEXT NOT NULL,
  access_token_enc TEXT NOT NULL,
  webhook_verify_token TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

-- 3. agents (Clerk users in org)
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'agent',
  is_online INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 4. contacts
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  phone TEXT NOT NULL,
  name TEXT,
  source TEXT,
  stage TEXT DEFAULT 'new',
  assigned_agent_id TEXT REFERENCES agents(id),
  fas_score INTEGER DEFAULT 0,
  fas_level TEXT,
  is_hot INTEGER DEFAULT 0,
  last_active_at TEXT,
  custom_attrs TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(org_id, phone)
);

-- 5. conversations
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  waba_number_id TEXT NOT NULL REFERENCES waba_numbers(id),
  status TEXT DEFAULT 'open',
  assigned_agent_id TEXT REFERENCES agents(id),
  window_type TEXT DEFAULT 'standard',
  window_expires_at TEXT,
  is_bot INTEGER DEFAULT 0,
  last_message_at TEXT,
  unread_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 6. messages (meta_message_id UNIQUE for webhook dedup)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  type TEXT NOT NULL,
  content TEXT,
  template_id TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'sent',
  sent_by TEXT,
  meta_message_id TEXT UNIQUE,
  meta_timestamp TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 7. templates (WhatsApp-approved)
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  body TEXT,
  meta_status TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 8. campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  template_id TEXT,
  segment_type TEXT,
  segment_filter TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_at TEXT,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  meta_cost_inr REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 9. playbook_activations
CREATE TABLE IF NOT EXISTS playbook_activations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  playbook_id TEXT NOT NULL,
  automation_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(org_id, playbook_id, automation_id)
);

-- 10. fas_events
CREATE TABLE IF NOT EXISTS fas_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  feature_id TEXT NOT NULL,
  occurred_at TEXT DEFAULT (datetime('now'))
);

-- 11. payment_links
CREATE TABLE IF NOT EXISTS payment_links (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  contact_id TEXT REFERENCES contacts(id),
  amount_paise INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  razorpay_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 12. contact_notes
CREATE TABLE IF NOT EXISTS contact_notes (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  body TEXT NOT NULL,
  created_by TEXT REFERENCES agents(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 13. conversation_tags
CREATE TABLE IF NOT EXISTS conversation_tags (
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  tag TEXT NOT NULL CHECK (tag IN ('hot_lead', 'lead', 'support', 'closed', 'new')),
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (conversation_id, tag)
);

-- 14. consent_records
CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  action TEXT NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now'))
);

-- 15. audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  action_type TEXT NOT NULL,
  payload TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last ON conversations(org_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fas_events_org ON fas_events(org_id, feature_id);
