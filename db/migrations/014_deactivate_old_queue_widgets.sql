-- Migration: Deactivate old individual queue widgets
-- Version: 014
-- Description: Mark the old individual queue widgets as inactive so they don't appear in Add Widgets menu

-- Mark individual queue widgets as inactive (cleanup)
UPDATE widgets SET is_active = false WHERE widget_key IN (
    'my-ticket-queue-widget',
    'unassigned-ticket-queue-widget', 
    'team-ticket-queue-widget',
    'all-ticket-queue-widget'
);

-- Create migrations log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migrations_log (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Log the migration
INSERT INTO migrations_log (migration_name, applied_at, description) VALUES
('014_deactivate_old_queue_widgets', CURRENT_TIMESTAMP, 'Deactivated old individual queue widgets to clean up Add Widgets menu')
ON CONFLICT (migration_name) DO NOTHING;