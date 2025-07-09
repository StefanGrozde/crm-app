-- Migration: Create widgets table
-- This migration creates a table to store widget metadata in the database
-- instead of hardcoding them in the frontend

CREATE TABLE IF NOT EXISTS widgets (
    id SERIAL PRIMARY KEY,
    widget_key VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'builtin-react' CHECK (type IN ('builtin-react', 'buildin', 'custom')),
    version VARCHAR(50) DEFAULT '1.0.0',
    author VARCHAR(255) DEFAULT 'System',
    entry VARCHAR(255),
    directory VARCHAR(255),
    config JSONB DEFAULT '{}',
    dependencies JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    available BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_widgets_key ON widgets(widget_key);
CREATE INDEX IF NOT EXISTS idx_widgets_type ON widgets(type);
CREATE INDEX IF NOT EXISTS idx_widgets_active ON widgets(is_active);
CREATE INDEX IF NOT EXISTS idx_widgets_sort_order ON widgets(sort_order);

-- Create trigger for updated_at
CREATE TRIGGER update_widgets_updated_at BEFORE UPDATE ON widgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert the built-in React widgets that were previously hardcoded
INSERT INTO widgets (widget_key, name, description, type, version, author, sort_order, available) VALUES
('contacts-widget', 'Contacts Widget', 'Manage and view contacts', 'builtin-react', '1.0.0', 'System', 1, true),
('leads-widget', 'Leads Widget', 'Manage and view leads', 'builtin-react', '1.0.0', 'System', 2, true),
('opportunities-widget', 'Opportunities Widget', 'Manage and view opportunities', 'builtin-react', '1.0.0', 'System', 3, true),
('companies-widget', 'Companies Widget', 'Manage and view companies', 'builtin-react', '1.0.0', 'System', 4, true),
('users-widget', 'Users Widget', 'Manage and view users', 'builtin-react', '1.0.0', 'System', 5, false),
('lead-conversion', 'Lead Conversion Analytics', 'Track lead conversion rates and metrics', 'builtin-react', '1.0.0', 'System', 6, true)
ON CONFLICT (widget_key) DO NOTHING; 