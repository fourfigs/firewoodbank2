-- Add pickup quantity fields for work orders
ALTER TABLE work_orders ADD COLUMN pickup_quantity_cords REAL;
ALTER TABLE work_orders ADD COLUMN pickup_length REAL;
ALTER TABLE work_orders ADD COLUMN pickup_width REAL;
ALTER TABLE work_orders ADD COLUMN pickup_height REAL;
ALTER TABLE work_orders ADD COLUMN pickup_units TEXT;
