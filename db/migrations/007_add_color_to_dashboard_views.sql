-- Migration: Add color field to dashboard_views table
-- This allows users to customize the color of their dashboard view tabs

ALTER TABLE dashboard_views 
ADD COLUMN color VARCHAR(20) DEFAULT 'blue';

-- Update existing views with default colors based on common patterns
-- You can customize these default colors as needed
UPDATE dashboard_views 
SET color = 'blue' 
WHERE color IS NULL OR color = ''; 