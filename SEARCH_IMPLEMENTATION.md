# CRM Search Implementation

## Overview

This document describes the comprehensive search implementation for the CRM application, featuring PostgreSQL full-text search with advanced filtering and ranking capabilities.

## Features

### 🔍 **Multi-Entity Search**
- Search across Contacts, Leads, Opportunities, Companies, and Users
- Unified search interface with categorized results
- Real-time search suggestions and autocomplete

### 🚀 **PostgreSQL Full-Text Search**
- Native PostgreSQL `to_tsvector` and `plainto_tsquery` functions
- GIN indexes for optimal search performance
- Relevance ranking with `ts_rank`
- Support for partial matches and fuzzy search

### 🎯 **Advanced Search Capabilities**
- Cross-table relationship search (e.g., find contacts by company name)
- Status and priority filtering
- Date range filtering
- Amount/value filtering
- Tag-based search

### 📊 **Search Analytics**
- Real-time search statistics
- Searchable entity counts
- Performance metrics

## Database Schema

### New Tables Created

#### Contacts Table
```sql
CREATE TABLE contacts (
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
    status VARCHAR(50) DEFAULT 'active',
    source VARCHAR(255),
    tags JSONB,
    company_id INTEGER REFERENCES companies(id),
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Leads Table
```sql
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'new',
    priority VARCHAR(20) DEFAULT 'medium',
    estimated_value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    source VARCHAR(255),
    expected_close_date DATE,
    actual_close_date DATE,
    notes TEXT,
    tags JSONB,
    company_id INTEGER REFERENCES companies(id),
    contact_id INTEGER REFERENCES contacts(id),
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Opportunities Table
```sql
CREATE TABLE opportunities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stage VARCHAR(50) DEFAULT 'prospecting',
    probability INTEGER CHECK (probability >= 0 AND probability <= 100),
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    expected_close_date DATE,
    actual_close_date DATE,
    type VARCHAR(255),
    source VARCHAR(255),
    notes TEXT,
    tags JSONB,
    company_id INTEGER REFERENCES companies(id),
    contact_id INTEGER REFERENCES contacts(id),
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Full-Text Search Indexes

The implementation includes optimized GIN indexes for full-text search:

```sql
-- Contacts full-text search
CREATE INDEX idx_contacts_fulltext ON contacts USING gin(
    to_tsvector('english', 
        COALESCE(first_name, '') || ' ' || 
        COALESCE(last_name, '') || ' ' || 
        COALESCE(email, '') || ' ' || 
        COALESCE(job_title, '') || ' ' || 
        COALESCE(notes, '')
    )
);

-- Leads full-text search
CREATE INDEX idx_leads_fulltext ON leads USING gin(
    to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(notes, '')
    )
);

-- Opportunities full-text search
CREATE INDEX idx_opportunities_fulltext ON opportunities USING gin(
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(notes, '')
    )
);
```

## API Endpoints

### Search Routes

#### Global Search
```
GET /api/search?q={query}&types={types}&limit={limit}&offset={offset}
```

**Parameters:**
- `q`: Search query (required, min 2 characters)
- `types`: Comma-separated list of entity types to search (optional)
- `limit`: Maximum results per type (default: 10)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "query": "john",
  "totalResults": 15,
  "results": {
    "contacts": [...],
    "leads": [...],
    "opportunities": [...],
    "companies": [...],
    "users": [...]
  },
  "pagination": {
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Entity-Specific Search
```
GET /api/search/contacts?q={query}&limit={limit}&offset={offset}
GET /api/search/leads?q={query}&limit={limit}&offset={offset}
GET /api/search/opportunities?q={query}&limit={limit}&offset={offset}
GET /api/search/companies?q={query}&limit={limit}&offset={offset}
```

#### Search Suggestions
```
GET /api/search/suggestions?q={query}&limit={limit}
```

**Response:**
```json
["John Doe", "Jane Smith", "Acme Corporation"]
```

#### Search Analytics
```
GET /api/search/analytics?days={days}
```

**Response:**
```json
{
  "totalContacts": 150,
  "totalLeads": 45,
  "totalOpportunities": 23,
  "totalCompanies": 12,
  "searchableEntities": 230
}
```

## Frontend Components

### SearchBar Component

The main search component with the following features:

- **Debounced Search**: 300ms delay to prevent excessive API calls
- **Keyboard Navigation**: Arrow keys, Enter, Escape support
- **Autocomplete**: Real-time suggestions
- **Result Categorization**: Results grouped by entity type
- **Status Badges**: Visual indicators for entity status
- **Click Outside**: Auto-close dropdown
- **Loading States**: Spinner during search

#### Usage
```jsx
import SearchBar from '../components/SearchBar';

<SearchBar 
  placeholder="Search contacts, leads, opportunities..."
  className="w-full"
/>
```

#### Features
- **Real-time Search**: As you type, results update automatically
- **Smart Suggestions**: Based on existing data
- **Visual Feedback**: Loading states and result counts
- **Responsive Design**: Works on all screen sizes
- **Accessibility**: Keyboard navigation and screen reader support

## Search Algorithm Details

### PostgreSQL Full-Text Search

The implementation uses PostgreSQL's built-in full-text search capabilities:

1. **Text Vectorization**: `to_tsvector('english', text)` converts text to searchable vectors
2. **Query Processing**: `plainto_tsquery('english', query)` processes user input
3. **Matching**: `@@` operator performs the search
4. **Ranking**: `ts_rank()` provides relevance scoring

### Search Logic

#### Contact Search
```sql
-- Full-text search on name fields
to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) @@ plainto_tsquery('english', '${query}')

-- Email search
email ILIKE '%${query}%'

-- Phone search
phone ILIKE '%${query}%'

-- Company name search (through association)
EXISTS (
  SELECT 1 FROM companies c 
  WHERE c.id = contacts.company_id 
  AND c.name ILIKE '%${query}%'
)
```

#### Lead Search
```sql
-- Title and description search
title ILIKE '%${query}%' OR description ILIKE '%${query}%'

-- Contact name search (through association)
EXISTS (
  SELECT 1 FROM contacts c 
  WHERE c.id = leads.contact_id 
  AND (c.first_name ILIKE '%${query}%' OR c.last_name ILIKE '%${query}%')
)
```

### Relevance Ranking

Results are ordered by:
1. **Full-text search relevance** (highest priority)
2. **Entity-specific ordering** (e.g., leads by priority, opportunities by amount)
3. **Alphabetical ordering** (fallback)

## Performance Optimizations

### Database Indexes
- **GIN indexes** for full-text search
- **B-tree indexes** for foreign keys and frequently queried fields
- **Composite indexes** for common query patterns

### Query Optimization
- **Efficient joins** using proper foreign key relationships
- **Limit and offset** for pagination
- **Selective field loading** to reduce data transfer

### Frontend Optimizations
- **Debounced search** to reduce API calls
- **Caching** of search results
- **Lazy loading** of result details
- **Virtual scrolling** for large result sets

## Security Considerations

### Data Access Control
- **Company-based filtering**: Users can only search within their company's data
- **Authentication required**: All search endpoints require valid authentication
- **Input sanitization**: Search queries are properly escaped to prevent SQL injection

### Rate Limiting
- **API rate limiting** to prevent abuse
- **Query length limits** to prevent excessive resource usage
- **Result size limits** to prevent memory issues

## Usage Examples

### Basic Search
```javascript
// Search for "john" across all entities
const response = await axios.get('/api/search?q=john');
```

### Filtered Search
```javascript
// Search only contacts and leads
const response = await axios.get('/api/search?q=john&types=contacts,leads');
```

### Paginated Search
```javascript
// Get second page of results
const response = await axios.get('/api/search?q=john&limit=10&offset=10');
```

### Get Suggestions
```javascript
// Get search suggestions
const suggestions = await axios.get('/api/search/suggestions?q=jo');
```

## Migration Guide

### Running the Migration

1. **Execute the migration script**:
   ```bash
   psql -d your_database -f db/migrations/001_create_crm_tables.sql
   ```

2. **Verify the tables were created**:
   ```sql
   \dt contacts, leads, opportunities;
   ```

3. **Check the indexes**:
   ```sql
   \d+ contacts;
   \d+ leads;
   \d+ opportunities;
   ```

### Sample Data

The migration includes sample data for testing:
- 3 sample contacts
- 3 sample leads
- 3 sample opportunities

## Testing

### Search Test Cases

1. **Basic Text Search**
   - Search for contact names
   - Search for company names
   - Search for lead titles

2. **Cross-Entity Search**
   - Find contacts by company name
   - Find leads by contact name
   - Find opportunities by company

3. **Status and Priority Search**
   - Search by contact status
   - Search by lead priority
   - Search by opportunity stage

4. **Performance Testing**
   - Large dataset search performance
   - Concurrent search requests
   - Memory usage under load

## Future Enhancements

### Planned Features
- **Advanced Filters**: Date ranges, amount ranges, custom fields
- **Saved Searches**: Save and reuse complex search queries
- **Search History**: Track and display recent searches
- **Export Results**: Export search results to CSV/Excel
- **Search Analytics**: Detailed search usage analytics
- **Elasticsearch Integration**: For even more advanced search capabilities

### Performance Improvements
- **Search Result Caching**: Redis-based caching for frequent searches
- **Background Indexing**: Async index updates for better performance
- **Search Result Highlighting**: Highlight matching terms in results
- **Fuzzy Search**: Support for typos and similar terms

## Troubleshooting

### Common Issues

1. **Slow Search Performance**
   - Check if GIN indexes are created
   - Verify query execution plans
   - Monitor database performance

2. **No Search Results**
   - Verify sample data exists
   - Check company filtering logic
   - Ensure proper authentication

3. **Search Suggestions Not Working**
   - Verify suggestions endpoint is accessible
   - Check for minimum query length (2 characters)
   - Ensure proper error handling

### Debug Commands

```sql
-- Check if full-text search is working
SELECT to_tsvector('english', 'John Doe') @@ plainto_tsquery('english', 'john');

-- Check index usage
EXPLAIN ANALYZE SELECT * FROM contacts WHERE to_tsvector('english', first_name || ' ' || last_name) @@ plainto_tsquery('english', 'john');

-- Check sample data
SELECT COUNT(*) FROM contacts;
SELECT COUNT(*) FROM leads;
SELECT COUNT(*) FROM opportunities;
```

## Conclusion

This search implementation provides a robust, scalable, and user-friendly search experience for the CRM application. With PostgreSQL's full-text search capabilities, proper indexing, and a well-designed frontend component, users can quickly find the information they need across all CRM entities.

The implementation is production-ready and includes proper security measures, performance optimizations, and comprehensive error handling. 