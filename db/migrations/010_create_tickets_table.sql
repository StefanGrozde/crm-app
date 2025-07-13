-- Migration: Create tickets and ticket_comments tables
-- Version: 010
-- Description: Creates ticket tracking system with comments and status tracking

-- Create tickets status enum
CREATE TYPE enum_tickets_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'on_hold');

-- Create tickets priority enum  
CREATE TYPE enum_tickets_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create tickets type enum
CREATE TYPE enum_tickets_type AS ENUM ('bug', 'feature_request', 'support', 'question', 'task', 'incident');

-- Create tickets table
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status enum_tickets_status DEFAULT 'open' NOT NULL,
    priority enum_tickets_priority DEFAULT 'medium' NOT NULL,
    type enum_tickets_type DEFAULT 'support' NOT NULL,
    tags JSONB DEFAULT '[]',
    
    -- Relationships
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Related entities (optional)
    related_lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    related_opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
    related_sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
    related_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Tracking fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    resolution_notes TEXT,
    
    -- Search optimization
    search_vector tsvector
);

-- Create ticket_comments table for conversation tracking
CREATE TABLE ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_tickets_company_id ON tickets(company_id);
CREATE INDEX idx_tickets_contact_id ON tickets(contact_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_type ON tickets(type);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_ticket_number ON tickets(ticket_number);

-- Related entity indexes
CREATE INDEX idx_tickets_related_lead_id ON tickets(related_lead_id);
CREATE INDEX idx_tickets_related_opportunity_id ON tickets(related_opportunity_id);
CREATE INDEX idx_tickets_related_sale_id ON tickets(related_sale_id);
CREATE INDEX idx_tickets_related_task_id ON tickets(related_task_id);

-- Full-text search index
CREATE INDEX idx_tickets_search ON tickets USING GIN(search_vector);

-- Ticket comments indexes
CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_comments_user_id ON ticket_comments(user_id);
CREATE INDEX idx_ticket_comments_created_at ON ticket_comments(created_at);

-- Create trigger for updated_at on tickets
CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_tickets_updated_at();

-- Create trigger for updated_at on ticket_comments
CREATE OR REPLACE FUNCTION update_ticket_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_comments_updated_at
    BEFORE UPDATE ON ticket_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_comments_updated_at();

-- Create trigger for full-text search vector update
CREATE OR REPLACE FUNCTION update_tickets_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.ticket_number, '') || ' ' ||
        COALESCE(NEW.title, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(NEW.resolution_notes, '') || ' ' ||
        COALESCE(array_to_string(NEW.tags, ' '), '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tickets_search_vector
    BEFORE INSERT OR UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_tickets_search_vector();

-- Create function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
    company_prefix VARCHAR(10);
BEGIN
    -- Get company prefix (first 3 letters of company name, uppercase)
    SELECT UPPER(SUBSTRING(name FROM 1 FOR 3)) INTO company_prefix
    FROM companies WHERE id = NEW.company_id;
    
    -- Get next ticket number for this company
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_num
    FROM tickets 
    WHERE company_id = NEW.company_id;
    
    -- Generate ticket number: COMPANY-YYYY-NNNNNN
    NEW.ticket_number := company_prefix || '-' || 
                        EXTRACT(YEAR FROM CURRENT_DATE) || '-' ||
                        LPAD(next_num::TEXT, 6, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_ticket_number
    BEFORE INSERT ON tickets
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
    EXECUTE FUNCTION generate_ticket_number();

-- Create trigger to automatically set resolved_at and closed_at timestamps
CREATE OR REPLACE FUNCTION update_ticket_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Set resolved_at when status changes to 'resolved'
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolved_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- Set closed_at when status changes to 'closed'
    IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
        NEW.closed_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- Clear timestamps if status changes back
    IF NEW.status != 'resolved' AND NEW.status != 'closed' THEN
        NEW.resolved_at = NULL;
    END IF;
    
    IF NEW.status != 'closed' THEN
        NEW.closed_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_status_timestamps
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_status_timestamps();