-- Add user address fields and auth logins table
ALTER TABLE users ADD COLUMN physical_address_line1 TEXT;
ALTER TABLE users ADD COLUMN physical_address_line2 TEXT;
ALTER TABLE users ADD COLUMN physical_address_city TEXT;
ALTER TABLE users ADD COLUMN physical_address_state TEXT;
ALTER TABLE users ADD COLUMN physical_address_postal_code TEXT;
ALTER TABLE users ADD COLUMN mailing_address_line1 TEXT;
ALTER TABLE users ADD COLUMN mailing_address_line2 TEXT;
ALTER TABLE users ADD COLUMN mailing_address_city TEXT;
ALTER TABLE users ADD COLUMN mailing_address_state TEXT;
ALTER TABLE users ADD COLUMN mailing_address_postal_code TEXT;

CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_auth_users_not_deleted ON auth_users(is_deleted);

-- Seed demo users + logins (admin/lead/staff/volunteer)
INSERT INTO users (
  id, name, email, telephone, role, hipaa_certified, is_driver,
  created_at, updated_at, is_deleted
)
SELECT lower(hex(randomblob(16))), 'Admin', 'admin@example.com', NULL, 'admin', 1, 0,
       datetime('now'), datetime('now'), 0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(name) = 'admin' AND is_deleted = 0);

INSERT INTO users (
  id, name, email, telephone, role, hipaa_certified, is_driver,
  created_at, updated_at, is_deleted
)
SELECT lower(hex(randomblob(16))), 'Lead', 'lead@example.com', NULL, 'lead', 1, 0,
       datetime('now'), datetime('now'), 0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(name) = 'lead' AND is_deleted = 0);

INSERT INTO users (
  id, name, email, telephone, role, hipaa_certified, is_driver,
  created_at, updated_at, is_deleted
)
SELECT lower(hex(randomblob(16))), 'Staff', 'staff@example.com', NULL, 'staff', 0, 0,
       datetime('now'), datetime('now'), 0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(name) = 'staff' AND is_deleted = 0);

INSERT INTO users (
  id, name, email, telephone, role, hipaa_certified, is_driver,
  created_at, updated_at, is_deleted
)
SELECT lower(hex(randomblob(16))), 'Volunteer', 'volunteer@example.com', NULL, 'volunteer', 0, 0,
       datetime('now'), datetime('now'), 0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(name) = 'volunteer' AND is_deleted = 0);

INSERT INTO auth_users (id, user_id, username, password, created_at, updated_at, is_deleted)
SELECT lower(hex(randomblob(16))), u.id, 'admin', 'admin', datetime('now'), datetime('now'), 0
FROM users u
WHERE lower(u.name) = 'admin'
  AND NOT EXISTS (SELECT 1 FROM auth_users WHERE lower(username) = 'admin');

INSERT INTO auth_users (id, user_id, username, password, created_at, updated_at, is_deleted)
SELECT lower(hex(randomblob(16))), u.id, 'lead', 'lead', datetime('now'), datetime('now'), 0
FROM users u
WHERE lower(u.name) = 'lead'
  AND NOT EXISTS (SELECT 1 FROM auth_users WHERE lower(username) = 'lead');

INSERT INTO auth_users (id, user_id, username, password, created_at, updated_at, is_deleted)
SELECT lower(hex(randomblob(16))), u.id, 'staff', 'staff', datetime('now'), datetime('now'), 0
FROM users u
WHERE lower(u.name) = 'staff'
  AND NOT EXISTS (SELECT 1 FROM auth_users WHERE lower(username) = 'staff');

INSERT INTO auth_users (id, user_id, username, password, created_at, updated_at, is_deleted)
SELECT lower(hex(randomblob(16))), u.id, 'volunteer', 'volunteer', datetime('now'), datetime('now'), 0
FROM users u
WHERE lower(u.name) = 'volunteer'
  AND NOT EXISTS (SELECT 1 FROM auth_users WHERE lower(username) = 'volunteer');
