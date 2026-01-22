-- Enforce work order status invariants and delivery event uniqueness

-- Validate allowed work order statuses
CREATE TRIGGER IF NOT EXISTS trg_work_orders_status_insert
BEFORE INSERT ON work_orders
WHEN NEW.status IS NOT NULL
  AND lower(NEW.status) NOT IN (
    'draft',
    'received',
    'pending',
    'rescheduled',
    'scheduled',
    'in_progress',
    'delivered',
    'issue',
    'completed',
    'cancelled',
    'picked_up'
  )
BEGIN
  SELECT RAISE(ABORT, 'Invalid work_orders.status');
END;

CREATE TRIGGER IF NOT EXISTS trg_work_orders_status_update
BEFORE UPDATE OF status ON work_orders
WHEN NEW.status IS NOT NULL
  AND lower(NEW.status) NOT IN (
    'draft',
    'received',
    'pending',
    'rescheduled',
    'scheduled',
    'in_progress',
    'delivered',
    'issue',
    'completed',
    'cancelled',
    'picked_up'
  )
BEGIN
  SELECT RAISE(ABORT, 'Invalid work_orders.status');
END;

-- Enforce scheduled_date status rules
CREATE TRIGGER IF NOT EXISTS trg_work_orders_schedule_insert
BEFORE INSERT ON work_orders
WHEN NEW.scheduled_date IS NOT NULL
  AND lower(NEW.status) NOT IN (
    'scheduled',
    'in_progress',
    'delivered',
    'issue',
    'completed',
    'cancelled',
    'picked_up'
  )
BEGIN
  SELECT RAISE(ABORT, 'Scheduled work orders must be scheduled or terminal');
END;

CREATE TRIGGER IF NOT EXISTS trg_work_orders_schedule_update
BEFORE UPDATE OF scheduled_date ON work_orders
WHEN NEW.scheduled_date IS NOT NULL
  AND lower(NEW.status) NOT IN (
    'scheduled',
    'in_progress',
    'delivered',
    'issue',
    'completed',
    'cancelled',
    'picked_up'
  )
BEGIN
  SELECT RAISE(ABORT, 'Scheduled work orders must be scheduled or terminal');
END;

CREATE TRIGGER IF NOT EXISTS trg_work_orders_schedule_status_update
BEFORE UPDATE OF status ON work_orders
WHEN NEW.scheduled_date IS NOT NULL
  AND lower(NEW.status) NOT IN (
    'scheduled',
    'in_progress',
    'delivered',
    'issue',
    'completed',
    'cancelled',
    'picked_up'
  )
BEGIN
  SELECT RAISE(ABORT, 'Scheduled work orders must be scheduled or terminal');
END;

-- Ensure unique delivery event per work order
WITH ranked_deliveries AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY work_order_id
      ORDER BY datetime(created_at) ASC
    ) AS rn
  FROM delivery_events
  WHERE is_deleted = 0
    AND event_type = 'delivery'
)
UPDATE delivery_events
SET is_deleted = 1,
    updated_at = datetime('now')
WHERE id IN (
  SELECT id FROM ranked_deliveries WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_events_work_order_delivery
ON delivery_events(work_order_id)
WHERE is_deleted = 0 AND event_type = 'delivery';

-- Index for lookups by work order
CREATE INDEX IF NOT EXISTS idx_delivery_events_work_order_id
ON delivery_events(work_order_id)
WHERE is_deleted = 0;
