-- Add audit log table and HIPAA flag for users
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  event TEXT NOT NULL,
  role TEXT,
  actor TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE users ADD COLUMN hipaa_certified INTEGER NOT NULL DEFAULT 0;

