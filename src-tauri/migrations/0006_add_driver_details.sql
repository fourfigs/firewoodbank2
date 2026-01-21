-- Add driver license number and expiration, and ensure driver flag storage
ALTER TABLE users ADD COLUMN driver_license_number TEXT;
ALTER TABLE users ADD COLUMN driver_license_expires_on TEXT;

