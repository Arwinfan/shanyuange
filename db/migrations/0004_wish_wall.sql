-- 便利签心愿墙
CREATE TABLE IF NOT EXISTS wish_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  nickname_raw TEXT NOT NULL,
  nickname_masked TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  color TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_wish_notes_public_created ON wish_notes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wish_notes_user_month ON wish_notes(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wish_likes (
  id TEXT PRIMARY KEY,
  wish_id TEXT NOT NULL REFERENCES wish_notes(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(wish_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_wish_likes_wish_created ON wish_likes(wish_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wish_likes_user ON wish_likes(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wish_reports (
  id TEXT PRIMARY KEY,
  wish_id TEXT NOT NULL REFERENCES wish_notes(id),
  reporter_id TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(wish_id, reporter_id)
);
CREATE INDEX IF NOT EXISTS idx_wish_reports_status_created ON wish_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wish_reports_wish ON wish_reports(wish_id, created_at DESC);
