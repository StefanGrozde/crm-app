-- Migration: Update users table to include missing fields
-- This migration adds the missing fields to the users table to match the User model

-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS role VARCHAR(255) DEFAULT 'Sales Representative',
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing users to have default values for required fields
UPDATE users 
SET 
    first_name = COALESCE(first_name, 'User'),
    last_name = COALESCE(last_name, 'User'),
    role = COALESCE(role, 'Sales Representative')
WHERE first_name IS NULL OR last_name IS NULL OR role IS NULL;

-- Make first_name and last_name NOT NULL after setting default values
ALTER TABLE users 
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 