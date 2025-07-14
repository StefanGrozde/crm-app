-- Migration: Create Audit System
-- Purpose: Implement comprehensive audit logging for all CRM changes
-- Version: 016
-- Author: Claude Code
-- Date: 2025-01-14

-- Create audit_logs table (IMMUTABLE - READ ONLY except for inserts)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'contact', 'lead', 'user', 'company', 'session', 'auth'
    entity_id INTEGER, -- NULL for session/auth events
    operation VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS', 'FAILED_LOGIN'
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    
    -- Change details
    field_name VARCHAR(100), -- NULL for CREATE/DELETE/SESSION operations
    old_value TEXT, -- JSON for complex objects
    new_value TEXT, -- JSON for complex objects
    
    -- Context information
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Session/Activity tracking
    session_duration INTEGER, -- Duration in seconds (for logout events)
    access_method VARCHAR(50), -- 'cookie_auth', 'login_form', 'session_resume'
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
    
    -- Security flags
    is_sensitive BOOLEAN DEFAULT false, -- Flag for sensitive changes (user, company, security)
    requires_approval BOOLEAN DEFAULT false, -- Flag for changes requiring approval
    
    -- Immutability enforcement
    record_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of record data for integrity
    is_deleted BOOLEAN DEFAULT false -- Soft delete only, NEVER hard delete
);

-- Create user_sessions table for active session tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Session metadata
    login_method VARCHAR(50), -- 'password', 'remember_me', 'session_resume'
    device_info JSONB DEFAULT '{}'::jsonb,
    location_info JSONB DEFAULT '{}'::jsonb
);

-- Add foreign key constraints (if tables exist)
DO $$
BEGIN
    -- Add foreign key for audit_logs.user_id if users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE audit_logs 
        ADD CONSTRAINT fk_audit_logs_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key for audit_logs.company_id if companies table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        ALTER TABLE audit_logs 
        ADD CONSTRAINT fk_audit_logs_company_id 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key for user_sessions.user_id if users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE user_sessions 
        ADD CONSTRAINT fk_user_sessions_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key for user_sessions.company_id if companies table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        ALTER TABLE user_sessions 
        ADD CONSTRAINT fk_user_sessions_company_id 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_sensitive ON audit_logs(is_sensitive, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_field ON audit_logs(entity_type, field_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON audit_logs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_auth_events ON audit_logs(entity_type, operation) WHERE entity_type IN ('session', 'auth');

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON user_sessions(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_company ON user_sessions(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_ip ON user_sessions(ip_address, created_at DESC);

-- CRITICAL: Prevent any UPDATE or DELETE operations on audit_logs
-- Create function to prevent audit modification
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. Updates and deletes are not permitted.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to prevent audit log modification
DROP TRIGGER IF EXISTS trigger_prevent_audit_update ON audit_logs;
CREATE TRIGGER trigger_prevent_audit_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

DROP TRIGGER IF EXISTS trigger_prevent_audit_delete ON audit_logs;
CREATE TRIGGER trigger_prevent_audit_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

-- Grant appropriate permissions (assuming app_user is the application database user)
-- Note: These might fail if the user doesn't exist, which is fine
DO $$
BEGIN
    -- Revoke dangerous permissions
    EXECUTE 'REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC';
    EXECUTE 'REVOKE UPDATE, DELETE ON audit_logs FROM CURRENT_USER';
    
    -- Grant only necessary permissions
    EXECUTE 'GRANT INSERT, SELECT ON audit_logs TO CURRENT_USER';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO CURRENT_USER';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO CURRENT_USER';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE user_sessions_id_seq TO CURRENT_USER';
EXCEPTION
    WHEN insufficient_privilege THEN
        -- If we don't have permission to grant/revoke, just continue
        RAISE NOTICE 'Insufficient privileges to set permissions, continuing...';
    WHEN undefined_object THEN
        -- If user doesn't exist, just continue
        RAISE NOTICE 'Database user not found, continuing...';
END $$;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Immutable audit log for all CRM system changes. Records are write-once and cannot be modified or deleted.';
COMMENT ON TABLE user_sessions IS 'Active user sessions for authentication tracking and security monitoring.';
COMMENT ON COLUMN audit_logs.record_hash IS 'SHA-256 hash for integrity verification. Prevents tampering with audit records.';
COMMENT ON COLUMN audit_logs.is_sensitive IS 'Marks sensitive operations (user/company/security changes) that require admin privileges to view.';
COMMENT ON COLUMN user_sessions.session_token IS 'JWT token or session identifier for tracking user sessions.';

-- Migration completed successfully
SELECT 'Audit system migration completed successfully' as status;