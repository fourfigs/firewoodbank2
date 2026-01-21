-- Create new clients table without client_number
CREATE TABLE clients_new (
  id TEXT PRIMARY KEY NOT NULL,
  client_title TEXT,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  physical_address_line1 TEXT NOT NULL,
  physical_address_line2 TEXT,
  physical_address_city TEXT NOT NULL,
  physical_address_state TEXT NOT NULL,
  physical_address_postal_code TEXT NOT NULL,
  mailing_address_line1 TEXT,
  mailing_address_line2 TEXT,
  mailing_address_city TEXT,
  mailing_address_state TEXT,
  mailing_address_postal_code TEXT,
  telephone TEXT,
  email TEXT,
  date_of_onboarding TEXT,
  how_did_they_hear_about_us TEXT,
  referring_agency TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  denial_reason TEXT,
  gate_combo TEXT,
  notes TEXT,
  wood_size_label TEXT,
  wood_size_other TEXT,
  directions TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

-- Copy data from old clients table, set defaults for new name fields if null
INSERT INTO clients_new (
  id, client_title, name, first_name, last_name,
  physical_address_line1, physical_address_line2,
  physical_address_city, physical_address_state, physical_address_postal_code,
  mailing_address_line1, mailing_address_line2, mailing_address_city,
  mailing_address_state, mailing_address_postal_code, telephone, email,
  date_of_onboarding, how_did_they_hear_about_us, referring_agency,
  approval_status, denial_reason, gate_combo, notes,
  wood_size_label, wood_size_other, directions, created_by_user_id,
  created_at, updated_at, last_synced_at, version, is_deleted
)
SELECT
  id, client_title, name, first_name, last_name,
  physical_address_line1, physical_address_line2,
  physical_address_city, physical_address_state, physical_address_postal_code,
  mailing_address_line1, mailing_address_line2, mailing_address_city,
  mailing_address_state, mailing_address_postal_code, telephone, email,
  date_of_onboarding, how_did_they_hear_about_us, referring_agency,
  approval_status, denial_reason, gate_combo, notes,
  wood_size_label, wood_size_other, directions, created_by_user_id,
  created_at, updated_at, last_synced_at, version, is_deleted
FROM clients;

-- Create new work_orders table without client_number
CREATE TABLE work_orders_new (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL,
  client_title TEXT,
  client_name TEXT NOT NULL,
  physical_address_line1 TEXT NOT NULL,
  physical_address_line2 TEXT,
  physical_address_city TEXT NOT NULL,
  physical_address_state TEXT NOT NULL,
  physical_address_postal_code TEXT NOT NULL,
  mailing_address_line1 TEXT,
  mailing_address_line2 TEXT,
  mailing_address_city TEXT,
  mailing_address_state TEXT,
  mailing_address_postal_code TEXT,
  telephone TEXT,
  email TEXT,
  directions TEXT,
  gate_combo TEXT,
  mileage REAL,
  other_heat_source_gas INTEGER NOT NULL DEFAULT 0,
  other_heat_source_electric INTEGER NOT NULL DEFAULT 0,
  other_heat_source_other TEXT,
  notes TEXT,
  scheduled_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  wood_size_label TEXT,
  wood_size_other TEXT,
  delivery_size_label TEXT,
  delivery_size_cords REAL,
  assignees_json TEXT DEFAULT '[]',
  created_by_display TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

INSERT INTO work_orders_new (
  id, client_id, client_title, client_name, physical_address_line1, physical_address_line2,
  physical_address_city, physical_address_state, physical_address_postal_code,
  mailing_address_line1, mailing_address_line2, mailing_address_city,
  mailing_address_state, mailing_address_postal_code, telephone, email, directions,
  gate_combo, mileage, other_heat_source_gas, other_heat_source_electric,
  other_heat_source_other, notes, scheduled_date, status,
  wood_size_label, wood_size_other, delivery_size_label, delivery_size_cords,
  assignees_json, created_by_display, created_by_user_id,
  created_at, updated_at, last_synced_at, version, is_deleted
)
SELECT
  id, client_id, client_title, client_name, physical_address_line1, physical_address_line2,
  physical_address_city, physical_address_state, physical_address_postal_code,
  mailing_address_line1, mailing_address_line2, mailing_address_city,
  mailing_address_state, mailing_address_postal_code, telephone, email, directions,
  gate_combo, mileage, other_heat_source_gas, other_heat_source_electric,
  other_heat_source_other, notes, scheduled_date, status,
  wood_size_label, wood_size_other, delivery_size_label, delivery_size_cords,
  assignees_json, created_by_display, created_by_user_id,
  created_at, updated_at, last_synced_at, version, is_deleted
FROM work_orders;

DROP TABLE work_orders;
DROP TABLE clients;

ALTER TABLE clients_new RENAME TO clients;

-- Create index for clients
CREATE INDEX IF NOT EXISTS idx_clients_not_deleted ON clients(is_deleted);

ALTER TABLE work_orders_new RENAME TO work_orders;

-- Recreate index for work_orders
CREATE INDEX IF NOT EXISTS idx_workorders_not_deleted ON work_orders(is_deleted);
