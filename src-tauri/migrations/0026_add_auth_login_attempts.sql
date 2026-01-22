-- Add login attempt tracking and password reset requests
CREATE TABLE IF NOT EXISTS auth_login_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_username ON auth_login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_created_at ON auth_login_attempts(created_at);

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  user_id TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_identifier ON password_reset_requests(identifier);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_requests(user_id);
