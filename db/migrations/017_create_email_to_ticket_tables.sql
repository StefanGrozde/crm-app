-- Migration 017: Create email-to-ticket tables
-- This migration creates the necessary tables for email-to-ticket functionality

-- Create email_configurations table
CREATE TABLE email_configurations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email_address VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Ticket creation settings
    default_ticket_type VARCHAR(50) NOT NULL DEFAULT 'support' CHECK (default_ticket_type IN ('bug', 'feature_request', 'support', 'question', 'task', 'incident')),
    default_ticket_priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (default_ticket_priority IN ('low', 'medium', 'high', 'urgent')),
    default_assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Email processing rules
    subject_prefix VARCHAR(50),
    auto_resolve_keywords JSONB DEFAULT '[]'::jsonb,
    ignored_senders JSONB DEFAULT '[]'::jsonb,
    
    -- Microsoft Graph webhook settings
    webhook_subscription_id VARCHAR(255),
    webhook_expiration_datetime TIMESTAMP WITH TIME ZONE,
    webhook_notification_url VARCHAR(500),
    
    -- Processing settings
    create_tickets_for_internal_emails BOOLEAN NOT NULL DEFAULT false,
    require_contact_match BOOLEAN NOT NULL DEFAULT false,
    auto_create_contacts BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_company_email UNIQUE (company_id, email_address)
);

-- Create email_processing table
CREATE TABLE email_processing (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email_config_id INTEGER NOT NULL REFERENCES email_configurations(id) ON DELETE CASCADE,
    
    -- Email identification
    message_id VARCHAR(500) NOT NULL UNIQUE,
    internet_message_id VARCHAR(500),
    conversation_id VARCHAR(500),
    
    -- Email metadata
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    received_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Processing status
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'ignored')),
    processing_error TEXT,
    
    -- Results
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    action_taken VARCHAR(20) CHECK (action_taken IN ('ticket_created', 'comment_added', 'ticket_reopened', 'ignored', 'error')),
    
    -- Conversation threading
    in_reply_to VARCHAR(500),
    email_references TEXT,
    parent_ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
    
    -- Email content (for debugging/audit)
    email_body TEXT,
    is_html BOOLEAN NOT NULL DEFAULT false,
    
    -- Webhook processing
    webhook_data JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for email_configurations
CREATE INDEX idx_email_configurations_company_id ON email_configurations(company_id);
CREATE INDEX idx_email_configurations_email_address ON email_configurations(email_address);
CREATE INDEX idx_email_configurations_is_active ON email_configurations(is_active);
CREATE INDEX idx_email_configurations_webhook_subscription_id ON email_configurations(webhook_subscription_id);

-- Create indexes for email_processing
CREATE INDEX idx_email_processing_company_id ON email_processing(company_id);
CREATE INDEX idx_email_processing_email_config_id ON email_processing(email_config_id);
CREATE INDEX idx_email_processing_message_id ON email_processing(message_id);
CREATE INDEX idx_email_processing_internet_message_id ON email_processing(internet_message_id);
CREATE INDEX idx_email_processing_conversation_id ON email_processing(conversation_id);
CREATE INDEX idx_email_processing_from_email ON email_processing(from_email);
CREATE INDEX idx_email_processing_processing_status ON email_processing(processing_status);
CREATE INDEX idx_email_processing_ticket_id ON email_processing(ticket_id);
CREATE INDEX idx_email_processing_parent_ticket_id ON email_processing(parent_ticket_id);
CREATE INDEX idx_email_processing_received_datetime ON email_processing(received_datetime);
CREATE INDEX idx_email_processing_processed_at ON email_processing(processed_at);
CREATE INDEX idx_email_processing_in_reply_to ON email_processing(in_reply_to);

-- Create trigger for updated_at on email_configurations
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_email_configurations
    BEFORE UPDATE ON email_configurations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Create trigger for updated_at on email_processing
CREATE TRIGGER set_timestamp_email_processing
    BEFORE UPDATE ON email_processing
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Create function to validate email address format
CREATE OR REPLACE FUNCTION validate_email_address(email_address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email_address ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Add check constraint for email address format
ALTER TABLE email_configurations ADD CONSTRAINT check_email_address_format 
    CHECK (validate_email_address(email_address));

ALTER TABLE email_processing ADD CONSTRAINT check_from_email_format 
    CHECK (validate_email_address(from_email));

-- Add comments to tables
COMMENT ON TABLE email_configurations IS 'Configuration settings for email-to-ticket functionality';
COMMENT ON TABLE email_processing IS 'Tracking table for processed emails and their outcomes';

-- Add comments to key columns
COMMENT ON COLUMN email_configurations.webhook_subscription_id IS 'Microsoft Graph webhook subscription ID';
COMMENT ON COLUMN email_configurations.subject_prefix IS 'Optional prefix to add to ticket titles';
COMMENT ON COLUMN email_configurations.auto_resolve_keywords IS 'Keywords that automatically resolve tickets';
COMMENT ON COLUMN email_configurations.ignored_senders IS 'Email addresses to ignore';

COMMENT ON COLUMN email_processing.message_id IS 'Microsoft Graph message ID';
COMMENT ON COLUMN email_processing.internet_message_id IS 'Email Message-ID header for conversation threading';
COMMENT ON COLUMN email_processing.conversation_id IS 'Microsoft Graph conversation ID';
COMMENT ON COLUMN email_processing.in_reply_to IS 'In-Reply-To header for conversation threading';
COMMENT ON COLUMN email_processing.email_references IS 'References header for conversation threading';
COMMENT ON COLUMN email_processing.email_body IS 'Email body content for debugging';
COMMENT ON COLUMN email_processing.webhook_data IS 'Raw webhook notification data';

-- Create view for email processing statistics
CREATE VIEW email_processing_stats AS
SELECT 
    ep.company_id,
    ec.email_address,
    DATE_TRUNC('day', ep.created_at) as processing_date,
    COUNT(*) as total_processed,
    COUNT(CASE WHEN ep.processing_status = 'completed' THEN 1 END) as successful,
    COUNT(CASE WHEN ep.processing_status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN ep.processing_status = 'ignored' THEN 1 END) as ignored,
    COUNT(CASE WHEN ep.action_taken = 'ticket_created' THEN 1 END) as tickets_created,
    COUNT(CASE WHEN ep.action_taken = 'comment_added' THEN 1 END) as comments_added,
    COUNT(CASE WHEN ep.action_taken = 'ticket_reopened' THEN 1 END) as tickets_reopened
FROM email_processing ep
JOIN email_configurations ec ON ep.email_config_id = ec.id
GROUP BY ep.company_id, ec.email_address, DATE_TRUNC('day', ep.created_at);

COMMENT ON VIEW email_processing_stats IS 'Daily statistics for email processing by company and email address';

-- Create indexes on the view (PostgreSQL will create these automatically for materialized views)
-- For now, we'll rely on the underlying table indexes

-- Grant permissions (adjust as needed for your application)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON email_configurations TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON email_processing TO your_app_user;
-- GRANT SELECT ON email_processing_stats TO your_app_user;
-- GRANT USAGE ON SEQUENCE email_configurations_id_seq TO your_app_user;
-- GRANT USAGE ON SEQUENCE email_processing_id_seq TO your_app_user;