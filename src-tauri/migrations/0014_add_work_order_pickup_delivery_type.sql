-- Add pickup/delivery type for work orders
ALTER TABLE work_orders ADD COLUMN pickup_delivery_type TEXT;
