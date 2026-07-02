-- Idempotent: adds phone column to users table if it doesn't already exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
