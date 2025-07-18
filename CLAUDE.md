# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend Development
```bash
# Start backend server (workers start on-demand)
cd backend && npm start

# Test database connection
curl http://localhost:8080/api/test-db

# Manually start bulk import worker (if needed)
node backend/workers/bulkImportWorker.js
```

### Frontend Development
```bash
# Start frontend development server
cd frontend && npm start

# Build production frontend
cd frontend && npm run build

# Run tests
cd frontend && npm test
```

### Database Operations
```bash
# Run database migrations
node backend/scripts/run-migration.js

# Run dashboard migrations
node backend/scripts/run-dashboard-migration.js

# Update users table
node backend/scripts/update-users-table.js

# Setup widgets
node backend/scripts/setup-widgets.js

# Check database schema
node backend/check-schema.js
```

### Database Schema Validation
```bash
# Get current schema
pg_dump -h host -p port -U user -d database --schema-only

# Connect to database
psql -h host -p port -U user -d database

# Check table structure
\d+ table_name

# Check indexes
\di

# Check constraints
\d+ table_name
```

## Architecture Overview

### Technology Stack
- **Backend**: Node.js with Express, PostgreSQL with Sequelize ORM
- **Frontend**: React 19 with React Router, Tailwind CSS, React Grid Layout
- **Database**: PostgreSQL with snake_case schema
- **Deployment**: AWS (Amplify frontend, Elastic Beanstalk backend, RDS database)
- **Authentication**: JWT with HTTP-only cookies, Microsoft 365 integration

### Database Schema
The database uses snake_case naming convention with comprehensive indexing and full-text search capabilities. Key tables include:

**Core Tables:**
- `users` - User authentication (id, username, password_hash, email, company_id, role)
- `companies` - Company/organization data with Microsoft 365 integration (id, name, industry, website, phone_number, ms365_client_id, ms365_client_secret, ms365_tenant_id, ms365_email_from, email_enabled)
- `contacts` - Contact management with full-text search (id, first_name, last_name, email, phone, mobile, job_title, department, address, city, state, zip_code, country, notes, status, source, tags, company_id, assigned_to, created_by)
- `leads` - Lead tracking with priority and status management (id, title, description, status, priority, estimated_value, currency, source, expected_close_date, actual_close_date, notes, tags, company_id, contact_id, assigned_to, created_by)
- `opportunities` - Sales opportunities with stage tracking (id, name, description, stage, probability, amount, currency, expected_close_date, actual_close_date, type, source, notes, tags, company_id, contact_id, assigned_to, created_by)

**System Tables:**
- `widgets` - Widget registry and configuration (id, widget_key, name, description, type, version, author, entry, directory, config, dependencies, is_active, sort_order)
- `dashboard_views` - User dashboard layouts (id, name, userId, is_default)
- `dashboard_widgets` - Widget positions in dashboard views (id, widgetKey, x, y, w, h, viewId)
- `user_invitations` - User invitation system (id, token, email, role, company_id, invited_by, expiresAt, is_used, used_at)

**Enums:**
- `enum_contacts_status`: 'active', 'inactive', 'prospect'
- `enum_leads_priority`: 'low', 'medium', 'high', 'urgent'
- `enum_leads_status`: 'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
- `enum_opportunities_stage`: 'prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'

**Key Features:**
- Full-text search indexes on contacts, leads, opportunities, and companies
- Automatic updated_at triggers on main tables
- Company-scoped data isolation with foreign key constraints
- Microsoft 365 integration fields for email functionality
- JSONB fields for flexible tags and configuration storage

### Backend Architecture
- **Models**: Sequelize models in `/backend/models/` with proper associations
- **Routes**: Express routes in `/backend/routes/` following RESTful conventions
- **Services**: Business logic in `/backend/services/`
- **Middleware**: Authentication (`authMiddleware.js`) and upload handling
- **Configuration**: Database config in `/backend/config/db.js`

### Frontend Architecture
- **Components**: React components in `/frontend/src/components/`
- **Pages**: Main pages in `/frontend/src/pages/`
- **Context**: AuthContext for authentication state management
- **Hooks**: Custom hooks for widget lifecycle and tab sessions
- **Routing**: React Router with private routes and admin routes
- **Configuration**: Entity configurations in `/frontend/src/config/entityConfigs.js`

## Widget System

### Widget Architecture
1. **Unified Widget System**: Configuration-driven EntityWidget for standardized CRUD operations
2. **Legacy Widgets**: Individual widget components (ContactsWidget, LeadsWidget, etc.)
3. **Built-in External Widgets**: File-based widgets in `/backend/widgets/buildin/`
4. **Custom Widgets**: User-uploaded widgets in `/backend/widgets/custom/`

### Unified Widget Implementation
- **EntityWidget.js**: Core generic component (~1,013 lines) handling all CRUD operations
- **entityConfigs.js**: Configuration definitions for different entity types
- **Wrapper Components**: Thin wrappers (e.g., UnifiedContactsWidget.js) for specific entities
- **Benefits**: 97% code reduction, consistent behavior, single source of truth

### Widget Types
1. **Built-in React Widgets**: Native React components (contacts, leads, opportunities, etc.)
2. **Built-in External Widgets**: File-based widgets in `/backend/widgets/buildin/`
3. **Custom Widgets**: User-uploaded widgets in `/backend/widgets/custom/`

### Widget Development
- **Preferred**: Use unified EntityWidget with configuration in entityConfigs.js
- **Legacy**: Use templates from `.cursor/rules/widget-creation-rule.mdc`
- Follow widget naming convention: `[name]-widget`
- Implement proper loading states, error handling, and pagination
- Use `useCallback` and `memo` for performance optimization
- Follow consistent search and filter patterns

### EntityWidget Features
- CRUD operations with form validation
- Search and advanced filtering
- Bulk operations and list management
- Undo delete functionality
- Tags system with Enter key input
- Custom actions (configurable buttons)
- Pagination with page controls
- Status badges with configurable colors

### Widget Configuration
- Widget configs defined in `/frontend/src/config/widgetConfig.js`
- Performance monitoring and security settings available
- Validation rules for widget manifests and file uploads

## Development Patterns

### Component Structure
Follow the established patterns in existing widgets:
- Use AuthContext for user authentication
- Implement proper loading and error states
- Use debounced search with 300ms timeout
- Include pagination for data tables
- Use Tailwind CSS for styling
- Implement proper form validation

### API Patterns
- All routes protected with `authMiddleware`
- Use company-scoped data filtering
- Implement proper error handling and validation
- Return pagination metadata for list endpoints
- Use Sequelize associations for related data

### Authentication Flow
- JWT tokens stored in HTTP-only cookies
- Microsoft 365 integration for SSO
- Role-based access control (Administrator, User)
- Company-based data isolation

## Important Notes

### Environment Variables
Required environment variables:
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`
- `REACT_APP_API_URL` (used consistently across all frontend components)

**Important**: All frontend components now use `process.env.REACT_APP_API_URL` for consistency.

### CORS Configuration
Frontend origins configured in `backend/index.js`:
- `https://main.dww6vb3yjjh85.amplifyapp.com`
- `https://crm.svnikolaturs.mk`  
- `http://localhost:3000`

### Database Migrations
- Use existing migration scripts in `/backend/scripts/`
- Always test migrations before deployment
- Database uses snake_case convention

### Widget Development Guidelines
- Make functions reusable for similar features
- Follow the component templates in Cursor rules
- Implement proper error boundaries
- Use consistent UI patterns across widgets
- Test widget lifecycle hooks properly

### Testing
- Frontend tests use React Testing Library
- Test files should be placed alongside components
- Use `npm test` in frontend directory to run tests

## Common Issues

### Database Connection
- Check environment variables are set correctly
- Use `/api/test-db` endpoint to verify connection
- Ensure PostgreSQL is running and accessible

### Widget Loading
- Check widget manifest files are valid JSON
- Verify widget files exist in correct directories
- Clear widget cache if changes not reflected

### Authentication
- Verify JWT_SECRET is set in environment
- Check cookie settings for CORS issues
- Ensure frontend API_URL points to correct backend
- All frontend components use `process.env.REACT_APP_API_URL` consistently

## Bulk Import System

### Architecture
The bulk import system uses an **on-demand worker pattern** for processing large files:

- **Job Queue**: Database-backed queue system for reliable job processing
- **On-Demand Workers**: Separate processes that spawn only when needed
- **File Processing**: Supports CSV, Excel (.xlsx, .xls) file uploads up to 10MB
- **Field Mapping**: Smart field detection and user-configurable mapping
- **Duplicate Handling**: Skip, update, or merge strategies for existing contacts
- **Progress Tracking**: Real-time progress updates with detailed statistics
- **Error Handling**: Comprehensive error tracking and reporting

### Key Features
- **On-Demand Workers**: Workers start only when import is triggered, auto-shutdown after 2min idle
- **Multi-step Wizard**: File upload → Field mapping → Processing → Results
- **Real-time Progress**: Polling-based progress tracking with detailed stats
- **Import History**: Complete audit trail with retry and delete capabilities
- **Notification System**: Completion notifications for users
- **Admin Monitoring**: Queue status and worker health monitoring
- **Resource Efficient**: Zero overhead when not importing, minimal memory footprint

### Database Tables
- `job_queue`: Background job management
- `bulk_imports`: Import session tracking
- `bulk_import_errors`: Detailed error records
- `bulk_import_successes`: Successfully imported contacts
- `bulk_import_stats`: Field-level import statistics

### API Endpoints
- `POST /api/bulk-import/upload`: File upload and validation
- `POST /api/bulk-import/start`: Start import process
- `GET /api/bulk-import/:id/progress`: Get import progress
- `GET /api/bulk-import/history`: Import history
- `GET /api/bulk-import/:id/results`: Detailed results
- `POST /api/bulk-import/:id/retry`: Retry failed imports
- `DELETE /api/bulk-import/:id`: Delete import
- `GET /api/bulk-import/queue/status`: Admin queue monitoring

### Frontend Components
- `BulkImportModal`: Main import wizard orchestrator
- `BulkImportFileUpload`: Drag & drop file upload
- `FieldMappingStep`: Smart field mapping with preview
- `ImportProgressModal`: Real-time progress tracking
- `ImportResultsModal`: Comprehensive results display
- `ImportHistoryModal`: Import history management

### Worker Management
Workers are spawned on-demand when imports are triggered and automatically shutdown after 2 minutes of inactivity. This provides:

- **Zero Memory Footprint**: No workers running when not needed
- **Instant Startup**: Workers spawn in ~1 second when needed
- **Auto Cleanup**: Workers automatically shutdown after idle timeout
- **Process Isolation**: Each worker runs in its own process for stability

For manual worker management:
```bash
# Workers start automatically when imports are triggered
# No manual startup needed

# Manual worker startup (if needed for debugging)
node backend/workers/bulkImportWorker.js
```

## Recent Changes

### Unified Widget System Implementation (✅ DEPLOYED & WORKING)
- **EntityWidget.js**: Core unified widget component handling all CRUD operations
- **entityConfigs.js**: Configuration-driven entity definitions for all widget types
- **Wrapper Components**: UnifiedContactsWidget, UnifiedLeadsWidget, UnifiedCompaniesWidget
- **Testing Tools**: ContactsWidgetComparison, WidgetSystemDemo, TestContactsWidget page
- **API URL Consistency**: Updated AuthContext.js to use `process.env.REACT_APP_API_URL`

### Deployment Status
- ✅ **ContactsWidget**: Fully working with unified system
- ✅ **LeadsWidget**: Fully working with unified system  
- 🚀 **Ready for Migration**: OpportunitiesWidget, CompaniesWidget, UsersWidget

### Files Added/Modified
- `/frontend/src/components/EntityWidget.js` (NEW - 1,013 lines) ✅ DEPLOYED
- `/frontend/src/config/entityConfigs.js` (NEW - 525 lines) ✅ DEPLOYED
- `/frontend/src/components/UnifiedContactsWidget.js` (NEW - 35 lines) ✅ WORKING
- `/frontend/src/components/UnifiedLeadsWidget.js` (NEW - 15 lines) ✅ WORKING
- `/frontend/src/components/UnifiedCompaniesWidget.js` (NEW - 15 lines) ✅ READY
- `/frontend/src/components/ContactsWidgetComparison.js` (NEW - 177 lines)
- `/frontend/src/components/WidgetSystemDemo.js` (NEW - demo/testing)
- `/frontend/src/pages/TestContactsWidget.js` (NEW - test page)
- `/frontend/src/context/AuthContext.js` (MODIFIED - API URL consistency) ✅ DEPLOYED
- `/frontend/src/App.js` (MODIFIED - added test route)
- `/UNIFIED_WIDGET_ANALYSIS.md` (NEW - comprehensive analysis)

### Complete Widget System Overhaul Plan

#### Phase 1: ✅ COMPLETED
- [x] Create EntityWidget core component
- [x] Implement entityConfigs for all entity types
- [x] Create UnifiedContactsWidget and test (WORKING)
- [x] Create UnifiedLeadsWidget and test (WORKING)
- [x] Deploy and validate (SUCCESSFUL)

#### Phase 2: Ready to Execute
1. **Replace ContactsWidget references** in dashboard/widget configurations
2. **Replace LeadsWidget references** in dashboard/widget configurations  
3. **Test OpportunitiesWidget migration** using existing config
4. **Test CompaniesWidget migration** using existing config
5. **Test UsersWidget migration** using existing config

#### Phase 3: Backend Enhancements (Optional)
- Add `/api/leads/filter-options` endpoint
- Add `/api/companies/filter-options` endpoint  
- Add `/api/users/filter-options` endpoint
- Enable filterOptions feature in configs

#### Phase 4: Cleanup ✅ COMPLETED
- [x] Remove duplicate backend files from root directory
- [x] Remove testing/demo components (ContactsWidgetComparison, WidgetSystemDemo, TestContactsWidget)
- [x] Remove obsolete documentation files
- [x] Clean up debug and test files
- [x] Update App.js routes
- [ ] Remove legacy widget files (kept for backward compatibility)
- [x] Updated widget registry to use unified widgets as primary