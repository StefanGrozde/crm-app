-- Migration: Register ticket queue widgets
-- Version: 013
-- Description: Register the new ticket queue widgets in the database

-- Insert the ticket queue widgets
INSERT INTO widgets (widget_key, name, description, type, version, author, sort_order, is_active, config) VALUES
(
    'my-ticket-queue-widget',
    'My Ticket Queue',
    'View and manage tickets assigned to me with filtering and bulk operations',
    'builtin-react',
    '1.0.0',
    'System',
    20,
    true,
    '{"queueType": "my", "features": {"stats": true, "bulkActions": true, "assignmentActions": false}}'
),
(
    'unassigned-ticket-queue-widget',
    'Unassigned Ticket Queue',
    'View and assign unassigned tickets with filtering and bulk operations',
    'builtin-react',
    '1.0.0',
    'System',
    21,
    true,
    '{"queueType": "unassigned", "features": {"stats": false, "bulkActions": true, "assignmentActions": true}}'
),
(
    'team-ticket-queue-widget',
    'Team Ticket Queue',
    'View and manage tickets assigned to team members with filtering and bulk operations',
    'builtin-react',
    '1.0.0',
    'System',
    22,
    true,
    '{"queueType": "team", "features": {"stats": false, "bulkActions": true, "assignmentActions": true}}'
),
(
    'all-ticket-queue-widget',
    'All Ticket Queue',
    'View and manage all tickets with comprehensive filtering and bulk operations',
    'builtin-react',
    '1.0.0',
    'System',
    23,
    true,
    '{"queueType": "all", "features": {"stats": true, "bulkActions": true, "assignmentActions": true}}'
),
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

-- Add ticket queue widgets to dependencies for dashboard functionality
-- Note: This assumes dashboard widgets might need to reference queue widgets
UPDATE widgets SET 
    dependencies = COALESCE(dependencies, '[]'::jsonb) || '["ticket-queue-dashboard-widget"]'::jsonb
WHERE widget_key IN ('my-ticket-queue-widget', 'unassigned-ticket-queue-widget', 'team-ticket-queue-widget', 'all-ticket-queue-widget')
AND NOT (dependencies @> '["ticket-queue-dashboard-widget"]'::jsonb);

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