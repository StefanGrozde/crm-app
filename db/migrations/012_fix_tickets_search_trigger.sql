-- Migration: Fix tickets search vector trigger for JSONB tags
-- Version: 012
-- Description: Fixes the search vector trigger to properly handle JSONB tags field

-- Drop and recreate the search vector trigger with proper JSONB handling
DROP TRIGGER IF EXISTS trigger_update_tickets_search_vector ON tickets;
DROP FUNCTION IF EXISTS update_tickets_search_vector();

-- Create corrected trigger for full-text search vector update
CREATE OR REPLACE FUNCTION update_tickets_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.ticket_number, '') || ' ' ||
        COALESCE(NEW.title, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(NEW.resolution_notes, '') || ' ' ||
        COALESCE(
            (SELECT string_agg(value::text, ' ') 
             FROM jsonb_array_elements_text(NEW.tags)), 
            ''
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tickets_search_vector
    BEFORE INSERT OR UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_tickets_search_vector();