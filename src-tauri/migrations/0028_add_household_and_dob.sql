-- Add household and date of birth tracking to clients table
ALTER TABLE clients ADD COLUMN household_id TEXT;
ALTER TABLE clients ADD COLUMN date_of_birth TEXT;
ALTER TABLE clients ADD COLUMN is_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN parent_name TEXT;
ALTER TABLE clients ADD COLUMN parent_phone TEXT;
ALTER TABLE clients ADD COLUMN parent_email TEXT;

-- Create indexes for efficient household queries
CREATE INDEX IF NOT EXISTS idx_clients_household_id ON clients(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_is_minor ON clients(is_minor) WHERE is_minor = 1;
