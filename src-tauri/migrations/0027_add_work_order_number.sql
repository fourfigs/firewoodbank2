-- Add work_order_number field to work_orders table
ALTER TABLE work_orders ADD COLUMN work_order_number TEXT;

-- Create index for work_order_number
CREATE INDEX IF NOT EXISTS idx_work_orders_number ON work_orders(work_order_number) WHERE work_order_number IS NOT NULL;
