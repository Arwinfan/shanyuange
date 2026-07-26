ALTER TABLE blessing_lamps ADD COLUMN expires_at TEXT;

UPDATE blessing_lamps
SET expires_at = CASE duration
  WHEN '7days' THEN strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+7 days')
  WHEN 'month' THEN strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+1 month')
  WHEN '100days' THEN strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+100 days')
  WHEN 'year' THEN strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+1 year')
  WHEN 'forever' THEN strftime('%Y-%m-%dT%H:%M:%fZ', created_at)
  ELSE strftime('%Y-%m-%dT%H:%M:%fZ', created_at)
END
WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lamps_active ON blessing_lamps(paid, expires_at, created_at DESC);