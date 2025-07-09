-- Migration: Create Lists System
-- This migration creates the lists functionality for grouping contacts, leads, opportunities, etc.

-- Create lists table
CREATE TABLE lists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'static', -- 'static' (manual) or 'smart' (rule-based)
    entity_type VARCHAR(50) NOT NULL, -- 'contact', 'lead', 'opportunity'
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code for UI
    icon VARCHAR(50) DEFAULT 'list', -- Icon identifier
    is_shared BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false, -- System-created lists (e.g., "All Contacts")
    smart_filters JSONB, -- For smart lists: filter conditions that auto-populate
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT lists_type_check CHECK (type IN ('static', 'smart')),
    CONSTRAINT lists_entity_type_check CHECK (entity_type IN ('contact', 'lead', 'opportunity'))
);

-- Create list_memberships table (many-to-many relationship)
-- This links existing contacts/leads/opportunities to lists
CREATE TABLE list_memberships (
    id SERIAL PRIMARY KEY,
    list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'contact', 'lead', 'opportunity'
    entity_id INTEGER NOT NULL, -- ID of the contact/lead/opportunity
    added_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique entity per list
    UNIQUE(list_id, entity_type, entity_id),
    
    -- Constraints
    CONSTRAINT list_memberships_entity_type_check CHECK (entity_type IN ('contact', 'lead', 'opportunity'))
);

-- Create list_shares table (for sharing lists between users)
CREATE TABLE list_shares (
    id SERIAL PRIMARY KEY,
    list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    shared_with INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL DEFAULT 'view', -- 'view', 'edit', 'admin'
    shared_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique share per user per list
    UNIQUE(list_id, shared_with),
    
    -- Constraints
    CONSTRAINT list_shares_permission_check CHECK (permission IN ('view', 'edit', 'admin'))
);

-- Create indexes for performance
CREATE INDEX idx_lists_company_id ON lists(company_id);
CREATE INDEX idx_lists_created_by ON lists(created_by);
CREATE INDEX idx_lists_entity_type ON lists(entity_type);
CREATE INDEX idx_lists_type ON lists(type);
CREATE INDEX idx_lists_is_shared ON lists(is_shared);
CREATE INDEX idx_lists_is_system ON lists(is_system);

CREATE INDEX idx_list_memberships_list_id ON list_memberships(list_id);
CREATE INDEX idx_list_memberships_entity_type ON list_memberships(entity_type);
CREATE INDEX idx_list_memberships_entity_id ON list_memberships(entity_id);
CREATE INDEX idx_list_memberships_entity_type_id ON list_memberships(entity_type, entity_id);
CREATE INDEX idx_list_memberships_added_by ON list_memberships(added_by);

CREATE INDEX idx_list_shares_list_id ON list_shares(list_id);
CREATE INDEX idx_list_shares_shared_with ON list_shares(shared_with);
CREATE INDEX idx_list_shares_shared_by ON list_shares(shared_by);

-- Create triggers for updated_at
CREATE TRIGGER update_lists_updated_at 
    BEFORE UPDATE ON lists 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE lists IS 'Lists for organizing contacts, leads, opportunities, etc.';
COMMENT ON TABLE list_memberships IS 'Junction table linking entities to lists';
COMMENT ON TABLE list_shares IS 'Sharing permissions for lists between users';

COMMENT ON COLUMN lists.type IS 'static = manual management, smart = rule-based auto-population';
COMMENT ON COLUMN lists.entity_type IS 'Type of entities this list contains (contact, lead, opportunity)';
COMMENT ON COLUMN lists.smart_filters IS 'JSON filters for smart lists that auto-populate';
COMMENT ON COLUMN lists.is_system IS 'System-created lists cannot be deleted by users';
COMMENT ON COLUMN list_memberships.entity_type IS 'Type of entity (contact, lead, opportunity)';
COMMENT ON COLUMN list_memberships.entity_id IS 'ID of the entity in its respective table';
COMMENT ON COLUMN list_shares.permission IS 'Permission level: view, edit, admin';