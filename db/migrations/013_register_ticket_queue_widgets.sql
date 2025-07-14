-- Migration: Register ticket queue widgets
-- Version: 013
-- Description: Register the new ticket queue widgets in the database

-- Insert the ticket queue widgets
INSERT INTO widgets (widget_key, name, description, type, version, author, sort_order, is_active, config) VALUES
(
    'ticket-queue-dashboard-widget',
    'Ticket Queue Dashboard',
    'Comprehensive ticket queue dashboard with tabs, statistics, and queue management',
    'builtin-react',
    '1.0.0',
    'System',
    24,
    true,
    '{"dashboardMode": true, "features": {"stats": true, "multiQueue": true, "priorityBreakdown": true}}'
),
(
    'configurable-ticket-queue-widget',
    'Ticket Queue (Configurable)',
    'Configurable ticket queue widget - choose your queue type during setup',
    'builtin-react',
    '1.0.0',
    'System',
    25,
    true,
    '{"configurable": true, "queueTypes": ["my", "unassigned", "team", "all"]}'
),
(
    'tickets-widget',
    'Tickets Widget',
    'Manage and view all tickets with advanced filtering, comments, and status tracking',
    'builtin-react',
    '1.0.0',
    'System',
    7,
    true,
    '{"entityType": "tickets", "features": {"customActions": true, "comments": true, "statusTracking": true}}'
),
(
    'tasks-widget',
    'Tasks Widget',
    'Manage and track tasks with assignments, due dates, and priority management',
    'builtin-react',
    '1.0.0',
    'System',
    8,
    true,
    '{"entityType": "tasks", "features": {"assignments": true, "dueDates": true, "priorityManagement": true}}'
)
ON CONFLICT (widget_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    type = EXCLUDED.type,
    version = EXCLUDED.version,
    author = EXCLUDED.author,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    config = EXCLUDED.config,
    updated_at = CURRENT_TIMESTAMP;

-- Update existing widgets to ensure proper sorting
UPDATE widgets SET sort_order = 6 WHERE widget_key = 'lead-conversion';
UPDATE widgets SET sort_order = 9 WHERE widget_key = 'users-widget';

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
('013_register_ticket_queue_widgets', CURRENT_TIMESTAMP, 'Registered ticket queue widgets and updated widget sorting')
ON CONFLICT (migration_name) DO NOTHING;