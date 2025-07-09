# Session Memory Feature

## Overview

The Session Memory feature automatically saves and restores your open dashboard tabs when you refresh the browser or navigate away and return. This ensures you don't lose your work and can continue where you left off.

## Features

### Automatic Session Persistence
- **Saves automatically**: Your open tabs, active tab, layouts, and edit modes are automatically saved to localStorage
- **Restores on refresh**: When you refresh the page, your previous session is automatically restored
- **User-specific**: Each user has their own session storage, so sessions don't interfere with each other

### Session Management
- **Session expiration**: Sessions automatically expire after 24 hours to prevent stale data
- **Validation**: Only valid tabs (existing views or search results) are restored
- **Fallback**: If no valid session exists, a default view is created

### Debug Tools
- **Session Info**: View detailed information about your current session
- **Clear Session**: Manually clear your saved session
- **Debug Panel**: Real-time status indicators in the debug panel
- **Seamless Restoration**: No loading messages - sessions restore silently in the background

## How It Works

### Session Storage
Sessions are stored in the browser's localStorage with the key format:
```
dashboard_tab_session_{userId}
```

### Session Data Structure
```javascript
{
  openTabs: [
    { id: 'view-1', name: 'My Dashboard', isDefault: false },
    { id: 'search-contact-123', name: 'John Doe (Contact)', isDefault: false }
  ],
  activeTabId: 'view-1',
  tabLayouts: {
    'view-1': [{ i: 'widget-1', x: 0, y: 0, w: 6, h: 2 }]
  },
  tabEditModes: {
    'view-1': false
  },
  timestamp: 1703123456789
}
```

### Session Lifecycle
1. **Creation**: When you open tabs, the session is automatically saved
2. **Validation**: On page load, the system checks if a valid session exists
3. **Restoration**: If valid, the session is restored with all tabs and layouts
4. **Expiration**: Sessions older than 24 hours are automatically cleared
5. **Cleanup**: Sessions are cleared when you log out

## Usage

### Normal Usage
The feature works automatically - no user interaction required:
1. Open multiple dashboard views and search results as tabs
2. Arrange widgets and enter edit mode as needed
3. Refresh the page or close/reopen the browser
4. Your session will be automatically restored

### Debug Tools
For administrators and debugging:

#### Session Info Button
- Shows detailed session information including:
  - Number of saved tabs
  - Active tab ID
  - Session age
  - Time until expiration

#### Clear Session Button
- Manually clears the current session
- Useful for testing or troubleshooting

#### Debug Panel Indicators
- **Session**: Shows "Saved" if a session exists, "None" if not
- **Active Tab**: Shows the currently active tab ID

## Technical Implementation

### Custom Hook: `useTabSession`
Located in `frontend/src/hooks/useTabSession.js`

**Key Functions:**
- `loadSession()`: Loads session data from localStorage
- `saveSession()`: Saves current session data
- `clearSession()`: Clears session data
- `hasSession()`: Checks if a valid session exists
- `getSessionInfo()`: Returns detailed session information

### Integration with Dashboard
The Dashboard component (`frontend/src/pages/Dashboard.js`) uses the session hook to:
- Replace manual tab state management
- Automatically save changes
- Restore sessions on page load
- Handle session validation and fallbacks

### Session Validation
When restoring a session, the system validates that:
- All saved tabs correspond to existing views (for regular tabs)
- Search result tabs are always considered valid
- Invalid tabs are filtered out
- If no valid tabs remain, a default view is created

## Testing

### Manual Testing
1. Open multiple dashboard views
2. Open some search results as tabs
3. Arrange widgets and enter edit mode
4. Refresh the page
5. Verify that all tabs are restored correctly

### Debug Testing
Use the test file `frontend/src/test-session.js` in the browser console:
```javascript
// Test basic session storage
testSessionStorage();

// Test session expiration
testSessionExpiration();
```

### Browser Storage Inspection
You can inspect the session data in browser dev tools:
1. Open DevTools → Application → Local Storage
2. Look for keys starting with `dashboard_tab_session_`
3. View the JSON data structure

## Configuration

### Session Expiration
The session expiration time can be modified in `useTabSession.js`:
```javascript
const SESSION_EXPIRY_HOURS = 24; // Change this value
```

### Storage Key
The localStorage key prefix can be modified:
```javascript
const SESSION_STORAGE_KEY = 'dashboard_tab_session'; // Change this value
```

## Troubleshooting

### Session Not Restoring
1. Check if localStorage is enabled in your browser
2. Verify the session hasn't expired (24 hours)
3. Check browser console for errors
4. Use the "Session Info" button to debug

### Invalid Tabs
If some tabs don't restore:
1. The corresponding views may have been deleted
2. Search result tabs are temporary and may not restore properly
3. Check the browser console for validation messages

### Performance Issues
- Sessions are automatically saved on every tab change
- Large sessions with many tabs may impact performance
- Consider clearing old sessions if performance degrades

## Future Enhancements

Potential improvements for the session memory feature:
- **Session compression**: Compress large session data
- **Selective restoration**: Allow users to choose which tabs to restore
- **Session export/import**: Save and load sessions as files
- **Cloud sync**: Sync sessions across devices
- **Session history**: Keep multiple session versions
- **Custom expiration**: Allow users to set their own expiration times 