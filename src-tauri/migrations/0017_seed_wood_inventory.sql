-- Seed default wood inventory items if they don't exist

-- Split Firewood: 0 cords, reorder at 1 cord
INSERT INTO inventory_items (id, name, category, quantity_on_hand, unit, reorder_threshold, reorder_amount, notes)
SELECT 
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
    'Split Firewood',
    'Wood',
    0,
    'cords',
    1,
    1,
    'Ready-to-deliver split firewood'
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_items 
    WHERE lower(name) LIKE '%split%firewood%' 
      AND is_deleted = 0
);

-- Unsplit Rounds: 0 cords, reorder at 1 cord
INSERT INTO inventory_items (id, name, category, quantity_on_hand, unit, reorder_threshold, reorder_amount, notes)
SELECT 
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
    'Unsplit Rounds',
    'Wood',
    0,
    'cords',
    1,
    1,
    'Raw logs/rounds needing splitting'
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_items 
    WHERE lower(name) LIKE '%unsplit%round%' 
      AND is_deleted = 0
);
