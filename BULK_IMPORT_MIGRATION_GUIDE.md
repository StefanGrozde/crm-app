# Bulk Import Migration Guide

This guide provides instructions for setting up the database schema for the Bulk Import Contacts feature using a single consolidated migration file.

## Overview

The bulk import system requires 5 new database tables, notification system extensions, utility functions, and supporting indexes. All of this is handled by a single migration file for simplicity.

## Prerequisites

- PostgreSQL database running
- Environment variables configured:
  - `DB_HOST`
  - `DB_PORT` 
  - `DB_DATABASE`
  - `DB_USER`
  - `DB_PASSWORD`
- Node.js environment with `pg` package installed

## Migration File

### `019_create_bulk_import_system.sql`

This single migration file creates the complete bulk import system:

1. **job_queue** - Background job processing system
2. **bulk_imports** - Main import tracking table
3. **bulk_import_errors** - Error tracking and categorization
4. **bulk_import_successes** - Success tracking and audit trail
5. **bulk_import_stats** - Field-level statistics and analytics
6. **Notification extensions** - Extends existing notification system
7. **Utility functions** - Helper functions for maintenance and reporting
8. **Indexes and constraints** - Performance optimization and data integrity

## Quick Start

### Run the Migration

```bash
# Method 1: Using the automated script (Recommended)
node scripts/run-bulk-import-migration.js

# Method 2: Using existing migration script
node backend/scripts/run-migration.js db/migrations/019_create_bulk_import_system.sql

# Method 3: Direct database execution
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -f db/migrations/019_create_bulk_import_system.sql
```

### Verify Installation

```bash
# Check if migration was successful
node scripts/run-bulk-import-migration.js --force
```

## Automated Migration Script

The `run-bulk-import-migration.js` script provides:

- **Safety checks** - Prevents duplicate migration runs
- **Comprehensive verification** - Validates all components were created
- **Detailed output** - Shows exactly what was created
- **Error handling** - Provides helpful debugging information
- **Status reporting** - Summarizes the migration results

### Usage

```bash
# Basic usage
node scripts/run-bulk-import-migration.js

# Force re-run even if tables exist
node scripts/run-bulk-import-migration.js --force

# Check status without running
node -e "require('./scripts/run-bulk-import-migration.js').checkMigrationStatus().then(console.log)"
```

## What Gets Created

### Tables

| Table | Purpose | Records |
|-------|---------|---------|
| `job_queue` | Background job processing | Jobs, priorities, retry logic |
| `bulk_imports` | Import operation tracking | File info, status, progress |
| `bulk_import_errors` | Error details | Row-level error information |
| `bulk_import_successes` | Success audit | Successfully imported contacts |
| `bulk_import_stats` | Field statistics | Data quality metrics |

### Indexes

- **Performance indexes** - For fast querying and filtering
- **Compound indexes** - For common query patterns
- **Unique indexes** - To prevent duplicate data
- **Foreign key indexes** - For referential integrity

### Functions

- `update_job_queue_updated_at()` - Auto-update timestamps
- `update_bulk_imports_updated_at()` - Auto-update timestamps
- `cleanup_old_bulk_import_notifications()` - Maintenance function
- `cleanup_old_completed_jobs()` - Cleanup old jobs
- `get_bulk_import_summary()` - Statistics reporting

### Triggers

- `trigger_job_queue_updated_at` - Auto-update job queue timestamps
- `trigger_bulk_imports_updated_at` - Auto-update import timestamps

### Constraints

- **Check constraints** - Data validation
- **Foreign key constraints** - Referential integrity
- **Unique constraints** - Prevent duplicates

## Verification

After migration, verify everything was created:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('job_queue', 'bulk_imports', 'bulk_import_errors', 'bulk_import_successes', 'bulk_import_stats');

-- Check indexes
SELECT tablename, indexname FROM pg_indexes 
WHERE tablename IN ('job_queue', 'bulk_imports', 'bulk_import_errors', 'bulk_import_successes', 'bulk_import_stats');

-- Check functions
SELECT proname FROM pg_proc 
WHERE proname IN ('update_job_queue_updated_at', 'update_bulk_imports_updated_at', 'cleanup_old_bulk_import_notifications', 'cleanup_old_completed_jobs', 'get_bulk_import_summary');

-- Check triggers
SELECT trigger_name, event_object_table FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_job_queue_updated_at', 'trigger_bulk_imports_updated_at');

-- Test utility function
SELECT * FROM get_bulk_import_summary(1, 1);
```

## Rollback

If you need to remove the bulk import system:

```bash
# WARNING: This will delete all bulk import data!
node scripts/rollback-bulk-import-migration.js --force

# With backup (creates temporary tables)
node scripts/rollback-bulk-import-migration.js --force --backup
```

### Rollback Safety

- **Checks existing data** - Warns if data will be lost
- **Confirms before proceeding** - Requires --force flag
- **Comprehensive cleanup** - Removes all components
- **Verification** - Confirms everything was removed

## Database Schema

### Entity Relationships

```
job_queue
├── Processes bulk_imports jobs
    └── bulk_imports (main table)
        ├── bulk_import_errors (1:many)
        ├── bulk_import_successes (1:many)
        └── bulk_import_stats (1:many)

notifications
├── References bulk_imports (when type='bulk_import')

users, companies, contacts
├── Referenced by various bulk import tables
```

### Key Features

- **Company isolation** - All data scoped to company
- **User tracking** - All operations tied to users
- **Soft deletes** - History preserved with deleted_at
- **Audit trail** - Complete tracking of all operations
- **Statistics** - Field-level quality metrics

## Performance Considerations

### Optimization

- **Indexed queries** - All common queries are indexed
- **Batch processing** - Designed for bulk operations
- **Background processing** - Non-blocking user experience
- **Cleanup functions** - Automatic maintenance

### Monitoring

```sql
-- Check job queue size
SELECT status, COUNT(*) FROM job_queue GROUP BY status;

-- Check import statistics
SELECT status, COUNT(*), AVG(processing_time_seconds) 
FROM bulk_imports 
GROUP BY status;

-- Check error patterns
SELECT error_type, COUNT(*) 
FROM bulk_import_errors 
GROUP BY error_type 
ORDER BY COUNT(*) DESC;
```

## Security

- **Company scoping** - All data isolated by company
- **User permissions** - All operations require authentication
- **Data validation** - Constraints prevent invalid data
- **Audit logging** - All operations are logged

## Troubleshooting

### Common Issues

1. **Permission denied**
   ```bash
   # Fix: Grant necessary permissions
   GRANT CREATE, ALTER, DROP ON DATABASE crm_app TO your_user;
   ```

2. **Table already exists**
   ```bash
   # Fix: Use force flag or run rollback first
   node scripts/rollback-bulk-import-migration.js --force
   node scripts/run-bulk-import-migration.js
   ```

3. **Foreign key violations**
   ```bash
   # Fix: Ensure required tables exist
   # Check users, companies, contacts tables exist
   ```

### Debug Commands

```sql
-- Check migration status
SELECT schemaname, tablename, tableowner 
FROM pg_tables 
WHERE tablename LIKE 'bulk_import%' OR tablename = 'job_queue';

-- Check constraints
SELECT conname, contype, conrelid::regclass as table_name 
FROM pg_constraint 
WHERE conrelid::regclass::text IN ('job_queue', 'bulk_imports', 'bulk_import_errors', 'bulk_import_successes', 'bulk_import_stats');

-- Check table sizes
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables 
WHERE tablename IN ('job_queue', 'bulk_imports', 'bulk_import_errors', 'bulk_import_successes', 'bulk_import_stats');
```

## Next Steps

After successful migration:

1. **Install Dependencies**
   ```bash
   cd backend
   npm install exceljs csv-parser node-cron
   ```

2. **Create Sequelize Models**
   - Implement models for all new tables
   - Add associations between models
   - Test model relationships

3. **Set Up Background Worker**
   ```bash
   node backend/workers/background-worker.js
   ```

4. **Follow Implementation Plan**
   - Refer to `BULK_IMPORT_IMPLEMENTATION_PLAN.md`
   - Implement phases 2-8 according to the plan

## Support

For migration issues:

1. **Check logs** - Look for specific error messages
2. **Verify permissions** - Ensure database user has necessary privileges
3. **Test connection** - Verify database connectivity
4. **Check dependencies** - Ensure referenced tables exist

```bash
# Test database connection
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "SELECT NOW();"

# Check required tables exist
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('users', 'companies', 'contacts', 'notifications');"
```

---

**⚠️ Important**: Always backup your database before running migrations in production!