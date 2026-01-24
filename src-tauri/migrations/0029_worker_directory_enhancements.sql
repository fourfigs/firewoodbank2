-- Worker directory: DL copy tracking, notes, 7-year retention
ALTER TABLE users ADD COLUMN dl_copy_on_file INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN notes TEXT;
ALTER TABLE users ADD COLUMN deleted_at TEXT;
