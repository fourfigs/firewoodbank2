-- Stage 5.2 intake hardening + reservations

-- Work order tuning
ALTER TABLE work_orders ADD COLUMN assignees_json TEXT;
ALTER TABLE work_orders ADD COLUMN wood_size_label TEXT;
ALTER TABLE work_orders ADD COLUMN wood_size_other TEXT;
ALTER TABLE work_orders ADD COLUMN delivery_size_label TEXT;
ALTER TABLE work_orders ADD COLUMN delivery_size_cords REAL;
ALTER TABLE work_orders ADD COLUMN created_by_display TEXT;

-- Inventory reservation tracking
ALTER TABLE inventory_items ADD COLUMN reserved_quantity REAL NOT NULL DEFAULT 0;

