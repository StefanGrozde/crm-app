-- Migration: Create complete bulk import system
-- Description: Creates all tables, indexes, constraints, and extensions needed for bulk import functionality
-- Author: System
-- Date: 2024-01-17

-- =============================================================================
-- 1. JOB QUEUE TABLE
-- =============================================================================

CREATE TABLE job_queue (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    job_data JSONB NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    scheduled_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Job queue indexes
CREATE INDEX idx_job_queue_status_priority ON job_queue(status, priority);
CREATE INDEX idx_job_queue_scheduled ON job_queue(scheduled_at);
CREATE INDEX idx_job_queue_type ON job_queue(job_type);
CREATE INDEX idx_job_queue_created_at ON job_queue(created_at);

-- Job queue update trigger
CREATE OR REPLACE FUNCTION update_job_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_job_queue_updated_at
    BEFORE UPDATE ON job_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_job_queue_updated_at();

-- =============================================================================
-- 2. BULK IMPORTS TABLE
-- =============================================================================

CREATE TABLE bulk_imports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    
    -- File Information
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('csv', 'xlsx', 'json')),
    
    -- Import Status & Progress
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled')),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    skipped_records INTEGER DEFAULT 0,
    
    -- Import Configuration
    import_settings JSONB DEFAULT '{}',
    duplicate_handling VARCHAR(20) DEFAULT 'skip' CHECK (duplicate_handling IN ('skip', 'overwrite', 'merge')),
    
    -- Processing Details
    processing_time_seconds INTEGER DEFAULT 0,
    error_summary TEXT,
    warning_summary TEXT,
    
    -- Timestamps
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Soft delete for history
    deleted_at TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_bulk_imports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bulk_imports_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Bulk imports indexes
CREATE INDEX idx_bulk_imports_user_company ON bulk_imports(user_id, company_id);
CREATE INDEX idx_bulk_imports_status ON bulk_imports(status);
CREATE INDEX idx_bulk_imports_created_at ON bulk_imports(created_at DESC);
CREATE INDEX idx_bulk_imports_file_type ON bulk_imports(file_type);
CREATE INDEX idx_bulk_imports_deleted_at ON bulk_imports(deleted_at);
CREATE INDEX idx_bulk_imports_company_status ON bulk_imports(company_id, status);

-- Bulk imports update trigger
CREATE OR REPLACE FUNCTION update_bulk_imports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bulk_imports_updated_at
    BEFORE UPDATE ON bulk_imports
    FOR EACH ROW
    EXECUTE FUNCTION update_bulk_imports_updated_at();

-- =============================================================================
-- 3. BULK IMPORT ERRORS TABLE
-- =============================================================================

CREATE TABLE bulk_import_errors (
    id SERIAL PRIMARY KEY,
    bulk_import_id INTEGER NOT NULL,
    
    -- Error Details
    row_number INTEGER NOT NULL,
    field_name VARCHAR(100),
    error_type VARCHAR(50) NOT NULL CHECK (error_type IN (
        'validation',
        'duplicate', 
        'format',
        'required',
        'invalid_email',
        'invalid_phone',
        'invalid_date',
        'invalid_enum',
        'length_exceeded',
        'system',
        'database',
        'unknown'
    )),
    error_message TEXT NOT NULL,
    error_code VARCHAR(20),
    
    -- Data Context
    row_data JSONB,
    suggested_fix TEXT,
    
    -- Error Status
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_bulk_import_errors_bulk_import FOREIGN KEY (bulk_import_id) REFERENCES bulk_imports(id) ON DELETE CASCADE
);

-- Bulk import errors indexes
CREATE INDEX idx_import_errors_bulk_import ON bulk_import_errors(bulk_import_id);
CREATE INDEX idx_import_errors_type ON bulk_import_errors(error_type);
CREATE INDEX idx_import_errors_row_number ON bulk_import_errors(bulk_import_id, row_number);
CREATE INDEX idx_import_errors_field_name ON bulk_import_errors(field_name);
CREATE INDEX idx_import_errors_resolved ON bulk_import_errors(is_resolved);
CREATE INDEX idx_import_errors_created_at ON bulk_import_errors(created_at);

-- =============================================================================
-- 4. BULK IMPORT SUCCESSES TABLE
-- =============================================================================

CREATE TABLE bulk_import_successes (
    id SERIAL PRIMARY KEY,
    bulk_import_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    row_number INTEGER NOT NULL,
    action_taken VARCHAR(20) NOT NULL CHECK (action_taken IN (
        'created',
        'updated', 
        'merged',
        'skipped_duplicate',
        'restored'
    )),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_bulk_import_successes_bulk_import FOREIGN KEY (bulk_import_id) REFERENCES bulk_imports(id) ON DELETE CASCADE,
    CONSTRAINT fk_bulk_import_successes_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Bulk import successes indexes
CREATE INDEX idx_import_successes_bulk_import ON bulk_import_successes(bulk_import_id);
CREATE INDEX idx_import_successes_contact ON bulk_import_successes(contact_id);
CREATE INDEX idx_import_successes_row_number ON bulk_import_successes(bulk_import_id, row_number);
CREATE INDEX idx_import_successes_action ON bulk_import_successes(action_taken);
CREATE INDEX idx_import_successes_created_at ON bulk_import_successes(created_at);

-- Unique constraint to prevent duplicate tracking
CREATE UNIQUE INDEX idx_import_successes_unique ON bulk_import_successes(bulk_import_id, contact_id, row_number);

-- =============================================================================
-- 5. BULK IMPORT STATS TABLE
-- =============================================================================

CREATE TABLE bulk_import_stats (
    id SERIAL PRIMARY KEY,
    bulk_import_id INTEGER NOT NULL,
    
    -- Field-level statistics
    field_name VARCHAR(100) NOT NULL,
    total_values INTEGER DEFAULT 0,
    valid_values INTEGER DEFAULT 0,
    invalid_values INTEGER DEFAULT 0,
    empty_values INTEGER DEFAULT 0,
    
    -- Additional statistics
    unique_values INTEGER DEFAULT 0,
    duplicate_values INTEGER DEFAULT 0,
    
    -- Common errors and patterns
    common_errors JSONB DEFAULT '[]',
    value_patterns JSONB DEFAULT '{}',
    
    -- Performance metrics
    processing_time_ms INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_bulk_import_stats_bulk_import FOREIGN KEY (bulk_import_id) REFERENCES bulk_imports(id) ON DELETE CASCADE,
    
    -- Data integrity constraints
    CONSTRAINT chk_total_values_positive CHECK (total_values >= 0),
    CONSTRAINT chk_valid_values_positive CHECK (valid_values >= 0),
    CONSTRAINT chk_invalid_values_positive CHECK (invalid_values >= 0),
    CONSTRAINT chk_empty_values_positive CHECK (empty_values >= 0),
    CONSTRAINT chk_values_sum CHECK (valid_values + invalid_values + empty_values = total_values)
);

-- Bulk import stats indexes
CREATE INDEX idx_import_stats_bulk_import ON bulk_import_stats(bulk_import_id);
CREATE INDEX idx_import_stats_field_name ON bulk_import_stats(field_name);
CREATE INDEX idx_import_stats_bulk_import_field ON bulk_import_stats(bulk_import_id, field_name);
CREATE INDEX idx_import_stats_created_at ON bulk_import_stats(created_at);

-- Unique constraint for field per import
CREATE UNIQUE INDEX idx_import_stats_unique ON bulk_import_stats(bulk_import_id, field_name);

-- =============================================================================
-- 6. NOTIFICATION SYSTEM EXTENSIONS
-- =============================================================================

-- Extend notification types for bulk import
DO $$
BEGIN
    -- Check if enum_notification_type exists and add bulk_import if not present
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_notification_type') THEN
        -- Add bulk_import to notification type enum if not exists
        BEGIN
            ALTER TYPE enum_notification_type ADD VALUE 'bulk_import';
        EXCEPTION WHEN duplicate_object THEN
            -- Value already exists, do nothing
            NULL;
        END;
    ELSE
        -- Create the enum if it doesn't exist
        CREATE TYPE enum_notification_type AS ENUM ('assignment', 'status_change', 'comment', 'due_date', 'bulk_import');
    END IF;
    
    -- Check if enum_notification_entity_type exists and add bulk_import if not present
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_notification_entity_type') THEN
        -- Add bulk_import to entity type enum if not exists
        BEGIN
            ALTER TYPE enum_notification_entity_type ADD VALUE 'bulk_import';
        EXCEPTION WHEN duplicate_object THEN
            -- Value already exists, do nothing
            NULL;
        END;
    ELSE
        -- Create the enum if it doesn't exist
        CREATE TYPE enum_notification_entity_type AS ENUM ('task', 'ticket', 'bulk_import');
    END IF;
END
$$;

-- Update notifications table constraints if needed
DO $$
BEGIN
    -- Check if notifications table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- Drop and recreate constraints to use the updated enums
        BEGIN
            ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
            ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_entity_type_check;
            
            -- Add updated constraints
            ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
                CHECK (type IN ('assignment', 'status_change', 'comment', 'due_date', 'bulk_import'));
            
            ALTER TABLE notifications ADD CONSTRAINT notifications_entity_type_check 
                CHECK (entity_type IN ('task', 'ticket', 'bulk_import'));
        EXCEPTION WHEN OTHERS THEN
            -- Log that we couldn't update constraints, but continue
            RAISE NOTICE 'Could not update notification constraints, they may already be correct';
        END;
    END IF;
END
$$;

-- Add indexes for bulk import notifications
CREATE INDEX IF NOT EXISTS idx_notifications_bulk_import 
    ON notifications(type, entity_type) 
    WHERE type = 'bulk_import' AND entity_type = 'bulk_import';

-- =============================================================================
-- 7. UTILITY FUNCTIONS
-- =============================================================================

-- Function to clean up old bulk import notifications
CREATE OR REPLACE FUNCTION cleanup_old_bulk_import_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete bulk import notifications older than 90 days
    DELETE FROM notifications 
    WHERE type = 'bulk_import' 
    AND created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old completed jobs
CREATE OR REPLACE FUNCTION cleanup_old_completed_jobs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete completed jobs older than 7 days
    DELETE FROM job_queue 
    WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get bulk import statistics
CREATE OR REPLACE FUNCTION get_bulk_import_summary(p_user_id INTEGER, p_company_id INTEGER)
RETURNS TABLE (
    total_imports INTEGER,
    successful_imports INTEGER,
    failed_imports INTEGER,
    total_contacts_imported INTEGER,
    success_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_imports,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as successful_imports,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::INTEGER as failed_imports,
        COALESCE(SUM(successful_records), 0)::INTEGER as total_contacts_imported,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0
        END as success_rate
    FROM bulk_imports
    WHERE user_id = p_user_id 
    AND company_id = p_company_id
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. COMMENTS AND DOCUMENTATION
-- =============================================================================

-- Table comments
COMMENT ON TABLE job_queue IS 'Queue for background jobs like bulk imports';
COMMENT ON TABLE bulk_imports IS 'Tracks all bulk import operations for contacts';
COMMENT ON TABLE bulk_import_errors IS 'Stores detailed error information for failed import records';
COMMENT ON TABLE bulk_import_successes IS 'Tracks successfully imported contacts for audit and analysis';
COMMENT ON TABLE bulk_import_stats IS 'Stores field-level statistics for import analysis and quality reporting';

-- Key column comments
COMMENT ON COLUMN job_queue.job_type IS 'Type of job (e.g., bulk_import, email_processing)';
COMMENT ON COLUMN job_queue.job_data IS 'JSON data required for job execution';
COMMENT ON COLUMN bulk_imports.file_name IS 'Original filename of uploaded file';
COMMENT ON COLUMN bulk_imports.status IS 'Current import status';
COMMENT ON COLUMN bulk_imports.duplicate_handling IS 'How to handle duplicate records';
COMMENT ON COLUMN bulk_imports.deleted_at IS 'Soft delete timestamp for history preservation';
COMMENT ON COLUMN bulk_import_errors.error_type IS 'Category of error (validation, duplicate, format, etc.)';
COMMENT ON COLUMN bulk_import_errors.suggested_fix IS 'Suggested solution to fix the error';
COMMENT ON COLUMN bulk_import_successes.action_taken IS 'What action was performed: created, updated, merged, etc.';
COMMENT ON COLUMN bulk_import_stats.field_name IS 'Name of the field being analyzed';

-- Function comments
COMMENT ON FUNCTION cleanup_old_bulk_import_notifications() IS 'Cleans up bulk import notifications older than 90 days';
COMMENT ON FUNCTION cleanup_old_completed_jobs() IS 'Cleans up completed jobs older than 7 days';
COMMENT ON FUNCTION get_bulk_import_summary(INTEGER, INTEGER) IS 'Gets summary statistics for bulk imports by user and company';

-- =============================================================================
-- 9. FINAL VERIFICATION
-- =============================================================================

-- Verify all tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name IN ('job_queue', 'bulk_imports', 'bulk_import_errors', 'bulk_import_successes', 'bulk_import_stats');
    
    IF table_count = 5 THEN
        RAISE NOTICE 'SUCCESS: All 5 bulk import tables created successfully';
    ELSE
        RAISE NOTICE 'WARNING: Only % out of 5 bulk import tables were created', table_count;
    END IF;
END
$$;

-- Migration completed successfully
SELECT 'Bulk Import System Migration Completed Successfully' AS status;