-- Stage 5.2 intake hardening + reservations (re-sequenced)

-- Work order tuning (assignees_json added in 0002_add_work_order_assignees)
ALTER TABLE work_orders ADD COLUMN wood_size_label TEXT;
ALTER TABLE work_orders ADD COLUMN wood_size_other TEXT;
ALTER TABLE work_orders ADD COLUMN delivery_size_label TEXT;
ALTER TABLE work_orders ADD COLUMN delivery_size_cords REAL;
ALTER TABLE work_orders ADD COLUMN created_by_display TEXT;

-- Inventory reservation tracking
ALTER TABLE inventory_items ADD COLUMN reserved_quantity REAL NOT NULL DEFAULT 0;

