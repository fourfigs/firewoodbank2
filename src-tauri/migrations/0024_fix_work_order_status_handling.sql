-- Fix work order status handling with proper business logic

-- Remove overly restrictive triggers that prevent valid status transitions
DROP TRIGGER IF EXISTS trg_work_orders_schedule_insert;
DROP TRIGGER IF EXISTS trg_work_orders_schedule_update;
DROP TRIGGER IF EXISTS trg_work_orders_schedule_status_update;

-- Create proper status transition validation
-- Allow scheduled work orders to be in active states (in_progress, delivered, issue)
-- Only prevent terminal states from being rescheduled
CREATE TRIGGER IF NOT EXISTS trg_work_orders_schedule_terminal_check
BEFORE UPDATE OF scheduled_date ON work_orders
WHEN NEW.scheduled_date IS NOT NULL
  AND lower(OLD.status) IN ('completed', 'cancelled', 'picked_up')
BEGIN
  SELECT RAISE(ABORT, 'Cannot reschedule completed, cancelled, or picked up work orders');
END;

-- Add status transition validation
CREATE TABLE IF NOT EXISTS work_order_status_transitions (
  id INTEGER PRIMARY KEY,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  allowed_roles TEXT NOT NULL, -- JSON array of roles that can make this transition
  requires_mileage INTEGER NOT NULL DEFAULT 0,
  requires_work_hours INTEGER NOT NULL DEFAULT 0,
  description TEXT
);

-- Insert allowed status transitions
INSERT OR IGNORE INTO work_order_status_transitions (from_status, to_status, allowed_roles, requires_mileage, requires_work_hours, description) VALUES
-- Draft transitions
('draft', 'scheduled', '["admin","lead","staff","employee"]', 0, 0, 'Schedule a draft work order'),
('draft', 'cancelled', '["admin","lead","staff","employee"]', 0, 0, 'Cancel a draft work order'),

-- Scheduled transitions
('scheduled', 'in_progress', '["admin","lead","staff","employee","volunteer"]', 0, 0, 'Start working on scheduled delivery'),
('scheduled', 'completed', '["admin","lead"]', 1, 1, 'Mark scheduled delivery as completed'),
('scheduled', 'cancelled', '["admin","lead","staff","employee"]', 0, 0, 'Cancel scheduled delivery'),

-- In progress transitions
('in_progress', 'delivered', '["admin","lead","staff","employee","volunteer"]', 0, 0, 'Mark delivery as completed by driver'),
('in_progress', 'completed', '["admin","lead"]', 1, 1, 'Mark work order as fully completed'),
('in_progress', 'issue', '["admin","lead","staff","employee","volunteer"]', 0, 0, 'Flag delivery issue'),
('in_progress', 'cancelled', '["admin","lead","staff","employee"]', 0, 0, 'Cancel in-progress delivery'),

-- Delivered transitions (waiting for admin approval)
('delivered', 'completed', '["admin","lead"]', 1, 1, 'Approve and complete delivered work order'),
('delivered', 'in_progress', '["admin","lead"]', 0, 0, 'Return to in-progress if issues found'),
('delivered', 'cancelled', '["admin","lead"]', 0, 0, 'Cancel delivered work order'),

-- Issue transitions
('issue', 'in_progress', '["admin","lead","staff","employee"]', 0, 0, 'Resolve issue and continue'),
('issue', 'cancelled', '["admin","lead"]', 0, 0, 'Cancel work order due to issue'),

-- Completed/Picked up/Cancelled are terminal states - no transitions allowed
('completed', 'completed', '[]', 0, 0, 'Terminal state'),
('picked_up', 'picked_up', '[]', 0, 0, 'Terminal state'),
('cancelled', 'cancelled', '[]', 0, 0, 'Terminal state');

-- Status transition validation is now handled in the application layer
-- to properly check user roles and permissions

-- Fix inventory adjustment logic for pickup vs delivery
-- Update the adjust_inventory_for_transition_tx function logic
-- (The actual function is in Rust, but we can add database constraints)

-- Add better indexes for work order queries
CREATE INDEX IF NOT EXISTS idx_work_orders_status_scheduled_date
ON work_orders(status, scheduled_date)
WHERE is_deleted = 0;

CREATE INDEX IF NOT EXISTS idx_work_orders_client_status
ON work_orders(client_id, status)
WHERE is_deleted = 0;

-- Add status history tracking
CREATE TABLE IF NOT EXISTS work_order_status_history (
  id TEXT PRIMARY KEY NOT NULL,
  work_order_id TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_user_id TEXT,
  change_reason TEXT,
  mileage_recorded REAL,
  work_hours_recorded REAL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_work_order_status_history_work_order
ON work_order_status_history(work_order_id);

CREATE INDEX IF NOT EXISTS idx_work_order_status_history_changed_at
ON work_order_status_history(changed_at);