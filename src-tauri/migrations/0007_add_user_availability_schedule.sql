-- Add weekly availability schedule to users table
ALTER TABLE users ADD COLUMN availability_schedule TEXT; -- JSON: {"monday": true, "tuesday": false, ...}

