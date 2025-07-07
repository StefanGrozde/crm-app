# Widget Availability Feature

This document describes the new widget availability feature that allows administrators to control which widgets appear in the "Add Widget" menu.

## Overview

The widget availability feature adds a new `available` column to the `widgets` table that controls whether a widget appears in the Add Widget menu. This provides fine-grained control over widget visibility without affecting existing widget instances.

## Database Changes

### New Column
- **Column**: `available`
- **Type**: `BOOLEAN`
- **Default**: `true`
- **Purpose**: Controls whether the widget appears in the Add Widget menu

### Migration
The migration `db/migrations/003_create_widgets_table.sql` includes:
```sql
available BOOLEAN DEFAULT true,
```

### Initial Data
The UsersWidget is set as unavailable by default:
```sql
('users-widget', 'Users Widget', 'Manage and view users', 'builtin-react', '1.0.0', 'System', 5, false),
```

## Backend Changes

### Widget Model (`backend/models/Widget.js`)
Added the `available` field to the Sequelize model:
```javascript
available: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
},
```

### Widget Service (`backend/services/widgetService.js`)
Updated `getWidgetManifest()` function to support filtering by availability:
```javascript
async function getWidgetManifest(forceRefresh = false, includeUnavailable = false)
```

- **includeUnavailable = false**: Only returns widgets where `available = true`
- **includeUnavailable = true**: Returns all widgets regardless of availability

### Widget Routes (`backend/routes/widgetRoutes.js`)
Updated the manifest endpoint to support the new parameter:
```javascript
const includeUnavailable = req.query.includeUnavailable === 'true';
const widgets = await widgetService.getWidgetManifest(false, includeUnavailable);
```

## Frontend Changes

### EditLayout Component (`frontend/src/pages/EditLayout.js`)
Updated to only load available widgets for the Add Widget menu:
```javascript
const widgetResponse = await axios.get(`${API_URL}/api/widgets/manifest?includeUnavailable=false`, { withCredentials: true });
```

### WidgetManager Component (`frontend/src/components/WidgetManager.js`)
Added UI controls for managing widget availability:

1. **Form Field**: Checkbox to toggle availability
2. **Status Display**: "Hidden" badge for unavailable widgets
3. **Admin Control**: Only administrators can modify availability

## Usage

### For End Users
- Only available widgets appear in the "Add Widget" menu
- Existing widget instances continue to work regardless of availability setting
- No impact on current dashboard layouts

### For Administrators
1. **Access Widget Manager**: Navigate to the admin widget management interface
2. **Edit Widget**: Click "Edit" on any widget
3. **Toggle Availability**: Check/uncheck "Available in Add Widget Menu"
4. **Save Changes**: Click "Update Widget"

### Widget States
- **Active + Available**: Widget appears in Add Widget menu and functions normally
- **Active + Hidden**: Widget functions normally but doesn't appear in Add Widget menu
- **Inactive**: Widget is completely disabled (regardless of availability)

## API Endpoints

### Get Available Widgets (for Add Widget menu)
```
GET /api/widgets/manifest?includeUnavailable=false
```

### Get All Widgets (for admin management)
```
GET /api/widgets/manifest?includeUnavailable=true
```

### Update Widget Availability
```
POST /api/widgets/database
{
    "widgetKey": "users-widget",
    "available": false
}
```

## Benefits

1. **Security**: Hide sensitive widgets (like UsersWidget) from regular users
2. **UX Control**: Reduce clutter in the Add Widget menu
3. **Flexibility**: Easy to enable/disable widgets without code changes
4. **Backward Compatibility**: Existing widget instances are unaffected

## Examples

### Hide UsersWidget from Add Widget Menu
```sql
UPDATE widgets SET available = false WHERE widget_key = 'users-widget';
```

### Show All Widgets in Admin Interface
The WidgetManager loads all widgets regardless of availability to allow administrators to manage them.

### Filter Widgets for End Users
The EditLayout only loads available widgets to keep the Add Widget menu clean.

## Future Enhancements

1. **User-Specific Availability**: Different availability per user role
2. **Conditional Availability**: Show widgets based on user permissions
3. **Bulk Operations**: Enable/disable multiple widgets at once
4. **Audit Logging**: Track availability changes
5. **Widget Categories**: Group widgets and control category availability

## Troubleshooting

### Widget Not Appearing in Add Widget Menu
1. Check if `available = true` in the database
2. Verify the widget is also `is_active = true`
3. Check browser console for API errors
4. Ensure user has proper permissions

### Widget Still Appears After Setting Available = False
1. Clear browser cache
2. Refresh the page
3. Check if the widget is cached on the frontend
4. Verify the API response includes the correct availability status

### Admin Can't See Widget in WidgetManager
1. Ensure the admin is using the correct API endpoint
2. Check if `includeUnavailable=true` parameter is being sent
3. Verify admin permissions
4. Check database connection and widget table structure 