-- Add Sales Widget to the database
INSERT INTO widgets (widget_key, name, description, type, version, author, sort_order, is_active) VALUES
('sales-widget', 'Sales Widget', 'Manage and view sales transactions', 'builtin-react', '1.0.0', 'System', 7, true)
ON CONFLICT (widget_key) DO NOTHING;