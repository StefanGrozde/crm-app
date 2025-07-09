-- Migration: Add Microsoft 365 email configuration to companies table
-- This migration adds fields for storing Microsoft 365 email integration settings

-- Add email configuration fields to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ms365_client_id VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ms365_client_secret TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ms365_tenant_id VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ms365_email_from VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_email_enabled ON companies(email_enabled);
CREATE INDEX IF NOT EXISTS idx_companies_ms365_tenant_id ON companies(ms365_tenant_id);

-- Add comments for documentation
COMMENT ON COLUMN companies.ms365_client_id IS 'Microsoft 365 Application (client) ID from Azure App Registration';
COMMENT ON COLUMN companies.ms365_client_secret IS 'Microsoft 365 Client Secret for authentication';
COMMENT ON COLUMN companies.ms365_tenant_id IS 'Microsoft 365 Directory (tenant) ID';
COMMENT ON COLUMN companies.ms365_email_from IS 'Email address to send emails from (must have Mail.Send permissions)';
COMMENT ON COLUMN companies.email_enabled IS 'Whether email functionality is enabled for this company'; 