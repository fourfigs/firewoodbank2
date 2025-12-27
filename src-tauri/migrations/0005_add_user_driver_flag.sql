-- Add driver capability flag (must align with DL validity in app logic)
ALTER TABLE users ADD COLUMN is_driver INTEGER NOT NULL DEFAULT 0;

