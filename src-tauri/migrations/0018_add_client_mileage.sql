-- Add mileage field to clients for auto-fill on future work orders
ALTER TABLE clients ADD COLUMN default_mileage REAL;

-- Add paired_order_id to work_orders for linking half F250 orders
ALTER TABLE work_orders ADD COLUMN paired_order_id TEXT;
