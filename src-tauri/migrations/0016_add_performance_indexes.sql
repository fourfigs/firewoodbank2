-- Add performance indexes for common query patterns

-- Work orders: frequently filtered by status and scheduled_date
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_date ON work_orders(scheduled_date) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_work_orders_status_scheduled ON work_orders(status, scheduled_date) WHERE is_deleted = 0;

-- Audit logs: frequently filtered by created_at for time-based reports
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Delivery events: frequently queried by start_date for calendar views
CREATE INDEX IF NOT EXISTS idx_delivery_events_start_date ON delivery_events(start_date) WHERE is_deleted = 0;

-- Clients: frequently searched by name
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name) WHERE is_deleted = 0;
