-- Migration: Add archived fields to tickets and tasks tables
-- Version: 011
-- Description: Adds archived field for soft delete functionality instead of hard deletes

-- Add archived field to tickets table
ALTER TABLE tickets ADD COLUMN archived BOOLEAN DEFAULT FALSE NOT NULL;

-- Add archived field to tasks table  
ALTER TABLE tasks ADD COLUMN archived BOOLEAN DEFAULT FALSE NOT NULL;

-- Add archived_at timestamp fields for tracking when items were archived
ALTER TABLE tickets ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance on archived queries
CREATE INDEX idx_tickets_archived ON tickets(archived);
CREATE INDEX idx_tasks_archived ON tasks(archived);

-- Create function to automatically set archived_at timestamp
CREATE OR REPLACE FUNCTION update_archived_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Set archived_at when archived changes to true
    IF NEW.archived = true AND OLD.archived = false THEN
        NEW.archived_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- Clear archived_at when archived changes to false (unarchive)
    IF NEW.archived = false AND OLD.archived = true THEN
        NEW.archived_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic archived_at timestamp updates
CREATE TRIGGER trigger_update_tickets_archived_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_archived_at();

CREATE TRIGGER trigger_update_tasks_archived_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_archived_at();