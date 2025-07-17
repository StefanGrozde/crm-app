-- Migration: Add available_mailboxes field to companies table
-- This enables multi-mailbox send-from selection for Phase 4 enhanced features

-- Add available_mailboxes column to companies table
ALTER TABLE companies 
ADD COLUMN available_mailboxes JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the field
COMMENT ON COLUMN companies.available_mailboxes IS 'Array of available mailboxes for sending emails. Format: [{"email": "support@company.com", "displayName": "Support", "isDefault": true, "isActive": true}]';

-- Create index for better JSON query performance
CREATE INDEX idx_companies_available_mailboxes ON companies USING GIN (available_mailboxes);

-- Migrate existing ms365_email_from to available_mailboxes array
UPDATE companies 
SET available_mailboxes = jsonb_build_array(
    jsonb_build_object(
        'email', ms365_email_from,
        'displayName', 'Default',
        'isDefault', true,
        'isActive', true
    )
)
WHERE ms365_email_from IS NOT NULL 
  AND ms365_email_from != ''
  AND (available_mailboxes IS NULL OR available_mailboxes = '[]'::jsonb);

-- Add simple validation constraint to ensure it's a valid JSONB array
ALTER TABLE companies 
ADD CONSTRAINT check_available_mailboxes_format 
CHECK (
    available_mailboxes IS NULL OR
    jsonb_typeof(available_mailboxes) = 'array'
);