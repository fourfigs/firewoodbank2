-- Add comprehensive financial and operational tracking

-- Expenses table for tracking all money spent
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL, -- 'fuel', 'equipment', 'supplies', 'maintenance', 'insurance', 'utilities', 'other'
  vendor TEXT,
  receipt_path TEXT, -- Path to stored receipt document
  expense_date TEXT NOT NULL,
  work_order_id TEXT, -- Associated work order if applicable
  recorded_by_user_id TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (recorded_by_user_id) REFERENCES users(id)
);

-- Donations table for tracking contributions received
CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY NOT NULL,
  donor_name TEXT,
  donor_contact TEXT,
  donation_type TEXT NOT NULL, -- 'wood', 'money', 'equipment', 'service', 'land'
  description TEXT NOT NULL,
  quantity REAL, -- For wood/equipment donations
  unit TEXT, -- 'cords', 'dollars', 'hours', etc.
  monetary_value REAL, -- Estimated dollar value
  received_date TEXT NOT NULL,
  recorded_by_user_id TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (recorded_by_user_id) REFERENCES users(id)
);

-- Enhanced time tracking table
CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  work_order_id TEXT,
  activity_type TEXT NOT NULL, -- 'delivery', 'pickup', 'maintenance', 'admin', 'training', 'meeting'
  hours_worked REAL NOT NULL,
  is_volunteer_time INTEGER NOT NULL DEFAULT 0, -- 1 for volunteer, 0 for paid
  hourly_rate REAL, -- For paid time
  date_worked TEXT NOT NULL,
  recorded_by_user_id TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (recorded_by_user_id) REFERENCES users(id)
);

-- Budget categories for financial planning
CREATE TABLE IF NOT EXISTS budget_categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  annual_budget REAL,
  category_type TEXT NOT NULL, -- 'expense', 'revenue'
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

-- Insert default budget categories
INSERT OR IGNORE INTO budget_categories (id, name, description, annual_budget, category_type, is_active) VALUES
  ('fuel', 'Fuel', 'Gasoline and diesel fuel for vehicles and equipment', 8000.00, 'expense', 1),
  ('equipment', 'Equipment', 'Tools, chainsaws, safety gear, and equipment purchases', 5000.00, 'expense', 1),
  ('maintenance', 'Maintenance', 'Vehicle and equipment repair and maintenance', 3000.00, 'expense', 1),
  ('supplies', 'Supplies', 'Oil, filters, chains, and other consumable supplies', 2000.00, 'expense', 1),
  ('insurance', 'Insurance', 'Vehicle and liability insurance', 2500.00, 'expense', 1),
  ('utilities', 'Utilities', 'Office utilities and phone', 1200.00, 'expense', 1),
  ('donations', 'Donations Received', 'Monetary and in-kind donations', NULL, 'revenue', 1),
  ('grants', 'Grants', 'Government and foundation grants', NULL, 'revenue', 1);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_expenses_work_order ON expenses(work_order_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_donations_type ON donations(donation_type) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(received_date) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date_worked) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_time_entries_work_order ON time_entries(work_order_id) WHERE is_deleted = 0;