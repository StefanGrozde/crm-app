-- Migration: Create Sales table
-- This migration creates the sales table for tracking sales records/transactions

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    sale_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'refunded')),
    sale_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(100),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partially_paid', 'failed', 'refunded')),
    payment_date DATE,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    commission_amount DECIMAL(15,2) DEFAULT 0,
    category VARCHAR(255),
    source VARCHAR(255),
    notes TEXT,
    tags JSONB,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_amount ON sales(amount);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_contact_id ON sales(contact_id);
CREATE INDEX IF NOT EXISTS idx_sales_lead_id ON sales(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunity_id ON sales(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_sales_assigned_to ON sales(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);

-- Full-text search index for sales
CREATE INDEX IF NOT EXISTS idx_sales_fulltext ON sales USING gin(
    to_tsvector('english', 
        COALESCE(sale_number, '') || ' ' || 
        COALESCE(title, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(category, '') || ' ' || 
        COALESCE(source, '') || ' ' || 
        COALESCE(notes, '')
    )
);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_updated_at();

-- Create sequence for sale numbers (if you want auto-generated sale numbers)
CREATE SEQUENCE IF NOT EXISTS sales_number_seq START 1000;

-- Create function to generate sale numbers
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS VARCHAR(100) AS $$
BEGIN
    RETURN 'SALE-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('sales_number_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;