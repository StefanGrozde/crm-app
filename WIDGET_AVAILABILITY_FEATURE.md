# Widget Availability Feature

## Overview

The Widget Availability feature allows administrators to control which widgets appear in the "Add Widget" menu for end users. This provides a way to hide sensitive or administrative widgets (like the Users Widget) from regular users while keeping them functional if they're already added to a dashboard.

## How It Works

### Database Schema

The `widgets` table includes an `is_active` boolean field that controls widget availability:

- `is_active = true`: Widget can be added from the Add Widget menu
- `is_active = false`: Widget is hidden from the Add Widget menu but remains functional if already added

### API Changes

The widget manifest API now supports filtering by active status:

- `GET /api/widgets/manifest` - Returns only active widgets (for end users)
- `GET /api/widgets/manifest?includeInactive=true` - Returns all widgets including inactive ones (for admin management)

### Frontend Changes

1. **EditLayout Component**: Only loads active widgets for the Add Widget menu
2. **WidgetManager Component**: Shows all widgets and allows toggling the `is_active` status
3. **Widget Display**: Shows a "Hidden" badge for inactive widgets in the admin interface

## Implementation Details

### Backend

- **Widget Service**: Updated to filter by `is_active` status
- **Widget Routes**: Added `includeInactive` query parameter support
- **Widget Model**: Uses `is_active` field for availability control

### Frontend

- **EditLayout**: Fetches only active widgets for the Add Widget modal
- **WidgetManager**: 
  - Shows all widgets (active and inactive)
  - Provides checkbox to toggle `is_active` status
  - Displays "Hidden" badge for inactive widgets
  - Updated form to use `is_active` instead of separate `available` field

## Usage

### For Administrators

1. Navigate to the Widget Manager (Admin only)
2. Find the widget you want to hide/show
3. Toggle the "Active (Available in Add Widget Menu)" checkbox
4. Save the changes

### For End Users

- Only active widgets appear in the Add Widget menu
- Hidden widgets remain functional if already added to dashboards
- No changes to existing functionality

## Default Configuration

The `users-widget` is set to inactive by default, hiding it from regular users while keeping it available for administrators.

## Benefits

1. **Security**: Hide sensitive administrative widgets from regular users
2. **Clean UI**: Reduce clutter in the Add Widget menu
3. **Flexibility**: Easy to show/hide widgets without affecting existing dashboards
4. **Backward Compatibility**: Existing widget layouts remain unchanged

## Migration

The system automatically migrated from the previous `available` field to using `is_active` for controlling widget availability. The `available` column has been removed from the database schema.

## API Endpoints

### Get Available Widgets (for Add Widget menu)
```
GET /api/widgets/manifest?includeInactive=false
```

### Get All Widgets (for admin management)
```
GET /api/widgets/manifest?includeInactive=true
```

### Update Widget Availability
```
POST /api/widgets/database
{
    "widgetKey": "users-widget",
    "is_active": false
}
```

## Troubleshooting

### Widget Not Appearing in Add Widget Menu
1. Check if `is_active = true` in the database
2. Verify the widget is also `is_active = true`
3. Check browser console for API errors
4. Ensure user has proper permissions

### Widget Still Appears After Setting Active = False
1. Clear browser cache
2. Refresh the page
3. Check if the widget is cached on the frontend
4. Verify the API response includes the correct active status

### Admin Can't See Widget in WidgetManager
1. Ensure the admin is using the correct API endpoint
2. Check if `includeInactive=true` parameter is being sent
3. Verify admin permissions
4. Check database connection and widget table structure 