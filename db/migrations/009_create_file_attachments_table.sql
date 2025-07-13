-- Migration: Create file_attachments table
-- This table will store file attachments for various entities like sales, leads, contacts, etc.

CREATE TABLE file_attachments (
    id SERIAL PRIMARY KEY,
    
    -- File information
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL UNIQUE,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_extension VARCHAR(10),
    
    -- Attachment metadata
    entity_type VARCHAR(50) NOT NULL, -- 'sale', 'lead', 'contact', 'opportunity', 'task', etc.
    entity_id INTEGER NOT NULL,
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- Access control
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_entity_type CHECK (entity_type IN ('sale', 'lead', 'contact', 'opportunity', 'task', 'company', 'user')),
    CONSTRAINT positive_file_size CHECK (file_size > 0)
);

-- Indexes for performance
CREATE INDEX idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
CREATE INDEX idx_file_attachments_company ON file_attachments(company_id);
CREATE INDEX idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);
CREATE INDEX idx_file_attachments_created_at ON file_attachments(created_at);
CREATE INDEX idx_file_attachments_mime_type ON file_attachments(mime_type);

-- Full-text search on file names and descriptions
CREATE INDEX idx_file_attachments_search ON file_attachments USING gin(
    to_tsvector('english', original_name || ' ' || COALESCE(description, ''))
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_file_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_file_attachments_updated_at
    BEFORE UPDATE ON file_attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_file_attachments_updated_at();