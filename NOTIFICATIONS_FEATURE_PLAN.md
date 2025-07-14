# Notifications Feature Implementation Plan

## Overview
Implement a comprehensive notifications system that displays user-specific notifications in the Navbar. The system will notify users about tasks and tickets assigned to them, status changes, and new comments.

## Feature Requirements

### Core Functionality
1. **User-specific notifications** - Each user sees only their own notifications
2. **Navbar integration** - Notifications appear in the top-right of the Navbar
3. **Task and ticket notifications** - Notifications for assignments, status changes, and comments
4. **Profile opening** - Users can click notifications to open task/ticket profiles
5. **Real-time updates** - Notifications update in real-time or near real-time

### Notification Types
1. **Assignment notifications** - When a task or ticket is assigned to the user
2. **Status change notifications** - When status changes on assigned tasks/tickets
3. **Comment notifications** - When new comments are added to assigned tasks/tickets
4. **Due date notifications** - When tasks approach their due dates (optional)

## Implementation Plan

### Phase 1: Database Schema and Backend API

#### Database Changes
1. **Create notifications table**
   ```sql
   CREATE TABLE notifications (
       id SERIAL PRIMARY KEY,
       user_id INTEGER NOT NULL REFERENCES users(id),
       company_id INTEGER NOT NULL REFERENCES companies(id),
       type VARCHAR(50) NOT NULL, -- 'assignment', 'status_change', 'comment', 'due_date'
       entity_type VARCHAR(50) NOT NULL, -- 'task', 'ticket'
       entity_id INTEGER NOT NULL,
       title VARCHAR(255) NOT NULL,
       message TEXT NOT NULL,
       is_read BOOLEAN DEFAULT false,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       data JSONB -- Additional notification data
   );
   ```

2. **Add indexes for performance**
   ```sql
   CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
   CREATE INDEX idx_notifications_company_user ON notifications(company_id, user_id);
   CREATE INDEX idx_notifications_created_at ON notifications(created_at);
   ```

#### Backend API Endpoints
1. **GET /api/notifications** - Get user's notifications with pagination
2. **PUT /api/notifications/:id/read** - Mark notification as read
3. **PUT /api/notifications/read-all** - Mark all notifications as read
4. **DELETE /api/notifications/:id** - Delete specific notification
5. **GET /api/notifications/unread-count** - Get count of unread notifications

#### Notification Service
1. **Create NotificationService** - Handle notification creation and management
2. **Integration points** - Add notification triggers to:
   - Task assignment creation/updates
   - Task status changes
   - Task comments
   - Ticket assignment creation/updates
   - Ticket status changes
   - Ticket comments

### Phase 2: Frontend Components

#### Notification Components
1. **NotificationBell** - Bell icon with unread count badge
2. **NotificationDropdown** - Dropdown panel showing notifications list
3. **NotificationItem** - Individual notification display component
4. **NotificationProvider** - Context provider for notifications state

#### Navbar Integration
1. **Add NotificationBell to Navbar** - Position in top-right
2. **Real-time updates** - Implement polling or WebSocket for live updates
3. **Notification management** - Mark as read, delete, click to open profiles

### Phase 3: Notification Triggers

#### Task Notifications
1. **Assignment notifications** - When TaskAssignment is created
2. **Status change notifications** - When Task status changes
3. **Comment notifications** - When new comments are added (if comment system exists)

#### Ticket Notifications
1. **Assignment notifications** - When ticket assigned_to changes
2. **Status change notifications** - When ticket status changes
3. **Comment notifications** - When new TicketComment is created

### Phase 4: UI/UX Enhancements

#### Visual Design
1. **Notification bell styling** - Clean, modern design with badge
2. **Dropdown styling** - Consistent with existing design system
3. **Notification items** - Clear, actionable notification display
4. **Loading states** - Smooth loading and update animations

#### User Experience
1. **Notification grouping** - Group similar notifications
2. **Auto-dismiss** - Automatically mark as read when clicked
3. **Batch operations** - Mark all as read functionality
4. **Notification filtering** - Filter by type or entity

## Technical Implementation Details

### File Structure
```
backend/
├── models/Notification.js
├── routes/notificationRoutes.js
├── services/NotificationService.js
├── middleware/notificationMiddleware.js
└── migrations/015_create_notifications_table.sql

frontend/src/
├── components/
│   ├── NotificationBell.js
│   ├── NotificationDropdown.js
│   ├── NotificationItem.js
│   └── NotificationProvider.js
├── hooks/
│   └── useNotifications.js
└── utils/
    └── notificationUtils.js
```

### Key Integration Points

#### Backend Integration
1. **TaskRoutes** - Add notification triggers to task CRUD operations
2. **TicketRoutes** - Add notification triggers to ticket CRUD operations
3. **AuthMiddleware** - Ensure notifications are user-scoped

#### Frontend Integration
1. **Navbar** - Add NotificationBell component
2. **Dashboard** - Connect notification clicks to profile opening system
3. **AuthContext** - Include notification state in auth context

### Database Migration
```sql
-- File: db/migrations/015_create_notifications_table.sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('assignment', 'status_change', 'comment', 'due_date')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('task', 'ticket')),
    entity_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data JSONB DEFAULT '{}'::jsonb,
    
    -- Ensure users only see notifications for their company
    CONSTRAINT notifications_company_user_check 
        CHECK (company_id = (SELECT company_id FROM users WHERE id = user_id))
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_company_user ON notifications(company_id, user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();
```

## Future Enhancements

### Advanced Features
1. **Push notifications** - Browser push notifications for immediate alerts
2. **Email notifications** - Send email for critical notifications
3. **Notification preferences** - User settings for notification types
4. **Bulk actions** - Advanced bulk notification management
5. **Notification history** - Archive and search past notifications

### Performance Optimizations
1. **Notification caching** - Cache frequently accessed notifications
2. **Pagination** - Efficient pagination for large notification lists
3. **Real-time updates** - WebSocket implementation for instant updates
4. **Background cleanup** - Automatically clean up old notifications

## Success Metrics
1. **User engagement** - Track notification click rates
2. **Response time** - Measure notification delivery speed
3. **User satisfaction** - Gather feedback on notification usefulness
4. **System performance** - Monitor notification system performance

## Testing Strategy
1. **Unit tests** - Test notification service functions
2. **Integration tests** - Test notification triggers and API endpoints
3. **UI tests** - Test notification components and interactions
4. **Performance tests** - Test notification system under load

## Rollout Plan
1. **Phase 1** - Backend implementation and basic frontend
2. **Phase 2** - UI/UX enhancements and testing
3. **Phase 3** - Advanced features and optimizations
4. **Phase 4** - User feedback and iterations

This plan provides a comprehensive roadmap for implementing a robust notifications feature that enhances user experience and keeps users informed about important updates to their assigned tasks and tickets.