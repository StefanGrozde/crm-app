# Widget Database Migration

This document describes the migration of hardcoded widgets from the frontend to the database for better maintainability and flexibility.

## Overview

Previously, the built-in React widgets were hardcoded in the `EditLayout.js` component. This made it difficult to:
- Add new widgets without code changes
- Modify widget metadata without redeployment
- Manage widget availability dynamically
- Sort and organize widgets

## Changes Made

### 1. Database Schema

**New Table: `widgets`**
```sql
CREATE TABLE widgets (
    id SERIAL PRIMARY KEY,
    widget_key VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'builtin-react',
    version VARCHAR(50) DEFAULT '1.0.0',
    author VARCHAR(255) DEFAULT 'System',
    entry VARCHAR(255),
    directory VARCHAR(255),
    config JSONB DEFAULT '{}',
    dependencies JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Backend Changes

#### New Files:
- `backend/models/Widget.js` - Sequelize model for widgets
- `backend/scripts/setup-widgets.js` - Migration script
- `db/migrations/003_create_widgets_table.sql` - Database migration

#### Modified Files:
- `backend/services/widgetService.js` - Updated to load widgets from database
- `backend/routes/widgetRoutes.js` - Added database widget management routes
- `backend/index.js` - Added Widget model import

#### New API Endpoints:
- `POST /api/widgets/database` - Create/update database widget
- `DELETE /api/widgets/database/:widgetKey` - Delete database widget
- `GET /api/widgets/database/:widgetKey` - Get single database widget

### 3. Frontend Changes

#### New Files:
- `frontend/src/components/WidgetManager.js` - Admin interface for managing widgets

#### Modified Files:
- `frontend/src/pages/EditLayout.js` - Removed hardcoded widgets

### 4. Widget Types

The system now supports three widget types:
- `builtin-react` - Built-in React components (stored in database)
- `buildin` - File-based built-in widgets (stored in filesystem)
- `custom` - User-uploaded custom widgets (stored in filesystem)

## Migration Steps

### 1. Run the Database Migration

```bash
# Navigate to backend directory
cd backend

# Run the migration script
node scripts/setup-widgets.js
```

### 2. Verify the Migration

The migration script will:
- Create the `widgets` table
- Insert the previously hardcoded widgets
- Display a list of migrated widgets

### 3. Restart the Backend

```bash
# Restart your backend server
npm start
```

## Widget Management

### Admin Interface

Administrators can now manage widgets through the Widget Manager interface:

1. **View All Widgets**: See all available widgets with their metadata
2. **Add New Widgets**: Create new database-stored widgets
3. **Edit Widgets**: Modify widget properties like name, description, type
4. **Delete Widgets**: Remove widgets (only for `builtin-react` type)
5. **Activate/Deactivate**: Enable or disable widgets without deletion

### Widget Properties

Each widget can have the following properties:
- **Widget Key**: Unique identifier (cannot be changed after creation)
- **Name**: Display name
- **Description**: Widget description
- **Type**: Widget type (`builtin-react`, `buildin`, `custom`)
- **Version**: Widget version
- **Author**: Widget author
- **Sort Order**: Display order in widget lists
- **Active Status**: Whether the widget is available for use

## Benefits

### 1. **Flexibility**
- Add new widgets without code changes
- Modify widget metadata dynamically
- Enable/disable widgets without deployment

### 2. **Maintainability**
- Centralized widget management
- No more hardcoded arrays in components
- Better organization and documentation

### 3. **Scalability**
- Easy to add new widget types
- Support for widget configuration
- Future support for widget dependencies

### 4. **User Experience**
- Admin interface for widget management
- Better widget discovery and organization
- Consistent widget metadata

## Future Enhancements

### 1. Widget Categories
Add support for widget categories to better organize widgets by function.

### 2. Widget Permissions
Implement role-based widget access control.

### 3. Widget Configuration
Add support for widget-specific configuration options.

### 4. Widget Dependencies
Implement widget dependency management for complex widgets.

### 5. Widget Versioning
Add support for widget version management and updates.

## Troubleshooting

### Widget Not Appearing
1. Check if the widget is active in the database
2. Verify the widget type is correct
3. Check the widget service logs for errors

### Migration Errors
1. Ensure database connection is working
2. Check that the migration script has proper permissions
3. Verify the migration file path is correct

### API Errors
1. Check that the Widget model is properly imported
2. Verify database table exists
3. Check authentication and authorization

## Rollback

If you need to rollback this migration:

1. **Database**: Drop the `widgets` table
2. **Backend**: Revert the widget service changes
3. **Frontend**: Restore the hardcoded widgets in EditLayout.js

However, this is not recommended as it will break existing widget configurations. 