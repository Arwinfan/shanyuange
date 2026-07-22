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