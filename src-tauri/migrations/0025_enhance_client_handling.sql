-- Enhance client handling with missing fields and new tracking capabilities

-- Add missing opt_out_email field
ALTER TABLE clients ADD COLUMN opt_out_email INTEGER NOT NULL DEFAULT 0;

-- Add emergency contact fields
ALTER TABLE clients ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE clients ADD COLUMN emergency_contact_phone TEXT;
ALTER TABLE clients ADD COLUMN emergency_contact_relationship TEXT;

-- Add household information fields
ALTER TABLE clients ADD COLUMN household_size INTEGER;
ALTER TABLE clients ADD COLUMN household_income_range TEXT; -- e.g., "under_25k", "25k_50k", "50k_75k", "75k_100k", "over_100k"
ALTER TABLE clients ADD COLUMN household_composition TEXT; -- JSON or text description

-- Add delivery preference fields
ALTER TABLE clients ADD COLUMN preferred_delivery_times TEXT; -- JSON array of preferred times/days
ALTER TABLE clients ADD COLUMN delivery_restrictions TEXT; -- Any restrictions or special instructions
ALTER TABLE clients ADD COLUMN preferred_driver_id TEXT; -- Reference to users table
ALTER TABLE clients ADD COLUMN seasonal_delivery_pattern TEXT; -- e.g., "winter_only", "year_round", "summer_only"

-- Add approval workflow tracking fields
ALTER TABLE clients ADD COLUMN approval_date TEXT;
ALTER TABLE clients ADD COLUMN approved_by_user_id TEXT;
ALTER TABLE clients ADD COLUMN approval_expires_on TEXT; -- For conditional approvals
ALTER TABLE clients ADD COLUMN last_reapproval_date TEXT;
ALTER TABLE clients ADD COLUMN requires_reapproval INTEGER NOT NULL DEFAULT 0;

-- Create client approval history table
CREATE TABLE IF NOT EXISTS client_approval_history (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by_user_id TEXT,
    reason TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (changed_by_user_id) REFERENCES auth_users(id)
);

CREATE INDEX IF NOT EXISTS idx_client_approval_history_client ON client_approval_history(client_id);
CREATE INDEX IF NOT EXISTS idx_client_approval_history_created_at ON client_approval_history(created_at);

-- Create client communication history table
CREATE TABLE IF NOT EXISTS client_communications (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT NOT NULL,
    communication_type TEXT NOT NULL, -- 'email', 'phone', 'mail', 'in_person', 'other'
    direction TEXT NOT NULL, -- 'inbound', 'outbound'
    subject TEXT,
    message TEXT,
    contacted_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    notes TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (contacted_by_user_id) REFERENCES auth_users(id)
);

CREATE INDEX IF NOT EXISTS idx_client_communications_client ON client_communications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_communications_created_at ON client_communications(created_at);
CREATE INDEX IF NOT EXISTS idx_client_communications_type ON client_communications(communication_type);

-- Create client feedback table
CREATE TABLE IF NOT EXISTS client_feedback (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT NOT NULL,
    work_order_id TEXT, -- Optional reference to specific work order
    feedback_type TEXT NOT NULL, -- 'satisfaction', 'complaint', 'suggestion', 'compliment'
    rating INTEGER, -- 1-5 scale for satisfaction
    comments TEXT,
    responded_to INTEGER NOT NULL DEFAULT 0,
    responded_by_user_id TEXT,
    response_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (responded_by_user_id) REFERENCES auth_users(id)
);

CREATE INDEX IF NOT EXISTS idx_client_feedback_client ON client_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_work_order ON client_feedback(work_order_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_type ON client_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_client_feedback_created_at ON client_feedback(created_at);

-- Create indexes for new client fields
CREATE INDEX IF NOT EXISTS idx_clients_approval_status ON clients(approval_status);
CREATE INDEX IF NOT EXISTS idx_clients_opt_out_email ON clients(opt_out_email);
CREATE INDEX IF NOT EXISTS idx_clients_preferred_driver ON clients(preferred_driver_id);
CREATE INDEX IF NOT EXISTS idx_clients_approval_date ON clients(approval_date);
