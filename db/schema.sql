-- ============================================================
-- Putiyuan D1 schema
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Service records
CREATE TABLE IF NOT EXISTS service_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid INTEGER NOT NULL DEFAULT 0,
  preview_data TEXT NOT NULL,
  full_data TEXT,
  request_data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_records_user ON service_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_type ON service_records(type);

-- Blessing lamps
CREATE TABLE IF NOT EXISTS blessing_lamps (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES service_records(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  name_raw TEXT NOT NULL,
  name_masked TEXT NOT NULL,
  donor_name_raw TEXT,
  donor_name_masked TEXT,
  relation TEXT NOT NULL,
  lamp_type TEXT NOT NULL,
  duration TEXT NOT NULL,
  wish TEXT,
  amount REAL NOT NULL DEFAULT 0,
  paid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lamps_paid ON blessing_lamps(paid, created_at DESC);

-- Incense offerings. One offering burns for thirty minutes after it is lit.
CREATE TABLE IF NOT EXISTS incense_offerings (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL UNIQUE REFERENCES service_records(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  dedication TEXT,
  wish TEXT,
  amount REAL NOT NULL DEFAULT 0,
  is_free INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  started_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_incense_user_created ON incense_offerings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incense_active ON incense_offerings(user_id, status, ends_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_incense_first_free ON incense_offerings(user_id)
WHERE is_free = 1;

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  record_id TEXT NOT NULL REFERENCES service_records(id),
  type TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_record ON orders(record_id);

-- Daily free usage
CREATE TABLE IF NOT EXISTS daily_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  record_id TEXT NOT NULL REFERENCES service_records(id),
  free INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usage_user_type_date ON daily_usage(user_id, type, usage_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_free_once ON daily_usage(user_id, type, usage_date, free)
WHERE free = 1;

-- Phone account bindings
CREATE TABLE IF NOT EXISTS user_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  phone TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON user_accounts(user_id);

-- SMS verification codes
CREATE TABLE IF NOT EXISTS sms_codes (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  scene TEXT NOT NULL DEFAULT 'login',
  expires_at TEXT NOT NULL,
  used_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_codes(phone, created_at DESC);

-- User login sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id, created_at DESC);

-- User feedback. Keep the report scoped to the submitting account so people can
-- review their own submissions without exposing other users' messages.
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,
  page_path TEXT,
  content TEXT NOT NULL,
  contact TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_created ON feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON feedback(status, created_at DESC);