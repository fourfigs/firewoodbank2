-- Add wood size and directions fields to clients table
ALTER TABLE clients ADD COLUMN wood_size_label TEXT;
ALTER TABLE clients ADD COLUMN wood_size_other TEXT;
ALTER TABLE clients ADD COLUMN directions TEXT;

