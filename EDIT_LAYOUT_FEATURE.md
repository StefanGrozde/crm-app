# Edit Layout Feature

## Overview

The Edit Layout feature provides a dedicated interface for editing dashboard layouts with full drag-and-drop, resize, and widget management capabilities. This is a separate page from the main Dashboard that focuses specifically on layout editing.

## Features

### Core Functionality
- **Drag & Drop**: Move widgets around the grid
- **Resize**: Resize widgets using the resize handles
- **Add Widgets**: Add new widgets from the available widget library
- **Remove Widgets**: Remove widgets with the red X button
- **Save Changes**: Save modifications to the current view
- **Save as New View**: Create a new view with the current layout
- **Reset**: Revert changes back to the original layout

### Widget Management
- **Built-in React Widgets**: Contacts, Leads, Opportunities, Companies, Users
- **External Widgets**: Support for uploaded custom widgets
- **Widget Library**: Dynamic loading of available widgets
- **Widget Configuration**: Per-widget settings and behavior

## Usage

### Accessing Edit Layout

1. **From Dashboard**: Click the "Edit Layout" button in the navbar when a dashboard view is active
2. **Direct URL**: Navigate to `/edit-layout/:viewId` where `:viewId` is the ID of the view to edit

### Editing Workflow

1. **Load View**: The component automatically loads the specified view and its widgets
2. **Edit Layout**: 
   - Drag widgets to reposition them
   - Use resize handles to change widget dimensions
   - Click the red X to remove widgets
   - Click "Add Widget" to add new widgets
3. **Save Changes**:
   - Click "Save Changes" to update the current view
   - Click "Save as New View" to create a new view with the current layout
   - Click "Reset" to revert all changes
4. **Return to Dashboard**: Click "Back to Dashboard" to return to the main dashboard

## Technical Implementation

### Frontend Components

#### EditLayout.js
- Main component for the edit layout page
- Handles all layout editing functionality
- Manages widget state and grid interactions
- Provides save/reset/cancel operations

#### WidgetRenderer.js
- Renders individual widgets with proper lifecycle management
- Handles loading states and error handling
- Supports different widget types (React, external, uploaded)

#### DynamicWidget.js
- Dynamic widget loader for different widget types
- Registry for built-in React widgets
- External widget loading capabilities

### Backend Routes

The EditLayout component uses existing backend routes:

- `GET /api/dashboard/views/:id` - Load a specific view
- `PUT /api/dashboard/views/:id` - Update a view with new layout
- `POST /api/dashboard/views` - Create a new view
- `GET /api/widgets/manifest` - Get available widgets

### Database Models

Uses existing models:
- `DashboardView` - Stores view metadata
- `DashboardWidget` - Stores widget layout information

## Configuration

### Widget Configuration
Widget behavior is controlled by `frontend/src/config/widgetConfig.js`:

```javascript
export const WIDGET_TYPE_CONFIG = {
    'contacts-widget': {
        renderMode: 'eager',
        showLoadingSpinner: true,
        autoReload: false,
        // ... other settings
    }
};
```

### Grid Configuration
The grid uses react-grid-layout with these settings:
- 12 columns on large screens
- Responsive breakpoints
- 100px row height
- 10px margins between widgets

## Security

- All routes require authentication
- Users can only edit their own views
- Widget uploads are restricted to administrators
- File type validation for uploaded widgets

## Performance

- Widgets are loaded lazily by default
- Memoized components prevent unnecessary re-renders
- Grid layout changes are debounced
- Widget lifecycle management optimizes memory usage

## Error Handling

- Graceful handling of widget loading failures
- User-friendly error messages
- Automatic retry mechanisms
- Fallback states for missing widgets

## Future Enhancements

- **Undo/Redo**: History management for layout changes
- **Templates**: Pre-built layout templates
- **Collaboration**: Real-time collaborative editing
- **Advanced Widgets**: More sophisticated widget types
- **Layout Validation**: Rules for widget placement and sizing 