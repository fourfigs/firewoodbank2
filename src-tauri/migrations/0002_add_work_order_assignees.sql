-- Add assignees tracking to work orders for volunteer/driver filtering.
ALTER TABLE work_orders ADD COLUMN assignees_json TEXT DEFAULT '[]';

