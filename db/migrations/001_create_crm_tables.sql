-- Migration: Create CRM tables with full-text search support
-- This migration creates the contacts, leads, and opportunities tables
-- with proper indexes for PostgreSQL full-text search

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    job_title VARCHAR(255),
    department VARCHAR(255),
    address TEXT,
    city VARCHAR(255),
    state VARCHAR(255),
    zip_code VARCHAR(20),
    country VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
    source VARCHAR(255),
    tags JSONB,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    estimated_value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    source VARCHAR(255),
    expected_close_date DATE,
    actual_close_date DATE,
    notes TEXT,
    tags JSONB,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stage VARCHAR(50) DEFAULT 'prospecting' CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
    probability INTEGER CHECK (probability >= 0 AND probability <= 100),
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    expected_close_date DATE,
    actual_close_date DATE,
    type VARCHAR(255),
    source VARCHAR(255),
    notes TEXT,
    tags JSONB,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better search performance
-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by);

-- Full-text search index for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_fulltext ON contacts USING gin(
    to_tsvector('english', 
        COALESCE(first_name, '') || ' ' || 
        COALESCE(last_name, '') || ' ' || 
        COALESCE(email, '') || ' ' || 
        COALESCE(job_title, '') || ' ' || 
        COALESCE(notes, '')
    )
);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_expected_close_date ON leads(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);

-- Full-text search index for leads
CREATE INDEX IF NOT EXISTS idx_leads_fulltext ON leads USING gin(
    to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(notes, '')
    )
);

-- Opportunities indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned_to ON opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_company_id ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_contact_id ON opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_expected_close_date ON opportunities(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_amount ON opportunities(amount);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_by ON opportunities(created_by);

-- Full-text search index for opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_fulltext ON opportunities USING gin(
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(notes, '')
    )
);

-- Companies full-text search index (if not exists)
CREATE INDEX IF NOT EXISTS idx_companies_fulltext ON companies USING gin(
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(industry, '') || ' ' || 
        COALESCE(website, '') || ' ' || 
        COALESCE(phone_number, '')
    )
);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO contacts (first_name, last_name, email, phone, job_title, company_id, created_by, status) VALUES
('John', 'Doe', 'john.doe@example.com', '+1-555-0101', 'Sales Manager', 1, 1, 'active'),
('Jane', 'Smith', 'jane.smith@example.com', '+1-555-0102', 'Marketing Director', 1, 1, 'active'),
('Bob', 'Johnson', 'bob.johnson@example.com', '+1-555-0103', 'CEO', 1, 1, 'prospect')
ON CONFLICT DO NOTHING;

INSERT INTO leads (title, description, status, priority, estimated_value, company_id, contact_id, created_by) VALUES
('New Software License Deal', 'Potential client interested in enterprise software license', 'qualified', 'high', 50000.00, 1, 1, 1),
('Website Redesign Project', 'Company looking to redesign their corporate website', 'contacted', 'medium', 25000.00, 1, 2, 1),
('Consulting Services', 'Strategic consulting for business transformation', 'new', 'low', 15000.00, 1, 3, 1)
ON CONFLICT DO NOTHING;

INSERT INTO opportunities (name, description, stage, probability, amount, company_id, contact_id, created_by) VALUES
('Enterprise Software Implementation', 'Full implementation of our enterprise software suite', 'proposal', 75, 100000.00, 1, 1, 1),
('Digital Marketing Campaign', 'Comprehensive digital marketing campaign for Q2', 'negotiation', 60, 35000.00, 1, 2, 1),
('Business Process Optimization', 'Consulting project to optimize business processes', 'qualification', 40, 20000.00, 1, 3, 1)
ON CONFLICT DO NOTHING; 