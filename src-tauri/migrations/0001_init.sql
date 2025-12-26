-- Sync-ready schema for Community Firewood Bank

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY NOT NULL,
  client_number TEXT NOT NULL,
  client_title TEXT,
  name TEXT NOT NULL,
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
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL,
  client_number TEXT NOT NULL,
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
  other_heat_source_gas INTEGER NOT NULL DEFAULT 0,
  other_heat_source_electric INTEGER NOT NULL DEFAULT 0,
  other_heat_source_other TEXT,
  notes TEXT,
  scheduled_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY NOT NULL,
  work_order_id TEXT,
  invoice_number TEXT NOT NULL,
  invoice_date TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  client_snapshot_json TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id TEXT PRIMARY KEY NOT NULL,
  invoice_id TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  role TEXT NOT NULL,
  availability_notes TEXT,
  driver_license_status TEXT,
  vehicle TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  quantity_on_hand REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  reorder_threshold REAL NOT NULL DEFAULT 0,
  reorder_amount REAL,
  notes TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS delivery_events (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  work_order_id TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  color_code TEXT,
  assigned_user_ids_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
);

CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requested_by_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS motd (
  id TEXT PRIMARY KEY NOT NULL,
  message TEXT NOT NULL,
  active_from TEXT,
  active_to TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_clients_not_deleted ON clients(is_deleted);
CREATE INDEX IF NOT EXISTS idx_inventory_not_deleted ON inventory_items(is_deleted);
CREATE INDEX IF NOT EXISTS idx_workorders_not_deleted ON work_orders(is_deleted);
CREATE INDEX IF NOT EXISTS idx_invoices_not_deleted ON invoices(is_deleted);
CREATE INDEX IF NOT EXISTS idx_delivery_not_deleted ON delivery_events(is_deleted);
CREATE INDEX IF NOT EXISTS idx_change_requests_not_deleted ON change_requests(is_deleted);
CREATE INDEX IF NOT EXISTS idx_motd_not_deleted ON motd(is_deleted);

