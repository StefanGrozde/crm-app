# Accounting & Audit System Implementation Plan

## Overview
Implement a comprehensive audit logging system that tracks all changes to CRM objects, providing accountability and change history. This addresses the "Accountability" component of AAA security and enables business intelligence through change tracking.

## Core Requirements

### 1. Change Tracking Scope
- **All Entity Changes**: Track create, update, delete operations on all entities
- **Field-Level Changes**: Record what specific fields changed, from what value to what value
- **User Attribution**: Who made the change
- **Timestamp Precision**: When the change occurred
- **Context Information**: From which IP, browser, session

### 2. Special Attention Objects (High Security)
- **Company**: Changes to company settings, integrations, billing
- **Users**: User creation, role changes, permissions, password changes
- **Security Settings**: Authentication settings, API keys, integrations
- **System Configuration**: Widget settings, dashboard configurations
- **User Sessions**: Login/logout events, session duration, app access patterns
- **Authentication Events**: Failed login attempts, password changes, session hijacking

### 3. Profile Widget Integration
- **Changes Section**: Add audit log section to all profile widgets
- **Timeline View**: Chronological display of all changes
- **Filtering**: Filter by date range, user, change type, field
- **Export**: Export change history for compliance

## Technical Architecture

### Database Schema

#### Audit Log Table (IMMUTABLE - READ ONLY)
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'contact', 'lead', 'user', 'company', 'session', 'auth'
    entity_id INTEGER, -- NULL for session/auth events
    operation VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS', 'FAILED_LOGIN'
    user_id INTEGER NOT NULL REFERENCES users(id),
    company_id INTEGER NOT NULL REFERENCES companies(id),
    
    -- Change details
    field_name VARCHAR(100), -- NULL for CREATE/DELETE/SESSION operations
    old_value TEXT, -- JSON for complex objects
    new_value TEXT, -- JSON for complex objects
    
    -- Context information
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Session/Activity tracking
    session_duration INTEGER, -- Duration in seconds (for logout events)
    access_method VARCHAR(50), -- 'cookie_auth', 'login_form', 'session_resume'
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
    
    -- Security flags
    is_sensitive BOOLEAN DEFAULT false, -- Flag for sensitive changes (user, company, security)
    requires_approval BOOLEAN DEFAULT false, -- Flag for changes requiring approval
    
    -- Immutability enforcement
    record_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of record data for integrity
    is_deleted BOOLEAN DEFAULT false -- Soft delete only, NEVER hard delete
);

-- Additional table for active user sessions
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    company_id INTEGER NOT NULL REFERENCES companies(id),
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Session metadata
    login_method VARCHAR(50), -- 'password', 'remember_me', 'session_resume'
    device_info JSONB DEFAULT '{}'::jsonb,
    location_info JSONB DEFAULT '{}'::jsonb
);

-- CRITICAL: Remove all UPDATE and DELETE permissions on audit_logs table
-- Only INSERT and SELECT are allowed
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
REVOKE UPDATE, DELETE ON audit_logs FROM app_user; -- Your app database user

-- Grant only INSERT and SELECT permissions
GRANT INSERT, SELECT ON audit_logs TO app_user;

-- Prevent any accidental updates with a trigger
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. Updates and deletes are not permitted.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_audit_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER trigger_prevent_audit_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();
```

#### Indexes for Performance
```sql
-- Audit logs indexes
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_logs_sensitive ON audit_logs(is_sensitive, created_at DESC);
CREATE INDEX idx_audit_logs_operation ON audit_logs(operation, created_at DESC);
CREATE INDEX idx_audit_logs_field ON audit_logs(entity_type, field_name);
CREATE INDEX idx_audit_logs_session ON audit_logs(session_id, created_at DESC);
CREATE INDEX idx_audit_logs_auth_events ON audit_logs(entity_type, operation) WHERE entity_type IN ('session', 'auth');

-- User sessions indexes
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, is_active);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_activity ON user_sessions(last_activity DESC);
CREATE INDEX idx_user_sessions_company ON user_sessions(company_id, is_active);
CREATE INDEX idx_user_sessions_ip ON user_sessions(ip_address, created_at DESC);
```

### Backend Implementation

#### 1. Audit Service (With Role-Based Access Control)
```javascript
// services/AuditService.js
class AuditService {
    // Define high-security entities that require admin access
    static HIGH_SECURITY_ENTITIES = ['user', 'company', 'system', 'security'];
    
    // Log entity changes (WRITE-ONLY operation)
    static async logChange(options) {
        // Calculate SHA-256 hash for record integrity
        const recordHash = this.calculateRecordHash(options);
        
        // Mark as sensitive if high-security entity
        const isSensitive = this.HIGH_SECURITY_ENTITIES.includes(options.entityType);
        
        // INSERT ONLY - never update or delete
        return await AuditLog.create({
            ...options,
            recordHash,
            isSensitive
        });
    }
    
    // Get change history for entity (with role-based filtering)
    static async getEntityHistory(entityType, entityId, userId, userRole, options = {}) {
        // Check if user can view this entity type
        if (this.HIGH_SECURITY_ENTITIES.includes(entityType) && userRole !== 'Administrator') {
            throw new Error('Access denied. Administrator role required to view sensitive audit logs.');
        }
        
        return await this.getAuditLogs({
            entityType,
            entityId,
            userId,
            userRole,
            ...options
        });
    }
    
    // Get user activity (admin only for sensitive entities)
    static async getUserActivity(targetUserId, requestingUserId, requestingUserRole, options = {}) {
        // Only admins can view other users' audit activity
        if (targetUserId !== requestingUserId && requestingUserRole !== 'Administrator') {
            throw new Error('Access denied. Administrator role required to view other users\' activity.');
        }
        
        return await this.getAuditLogs({
            userId: targetUserId,
            requestingUserRole,
            ...options
        });
    }
    
    // Get company audit trail (admin only)
    static async getCompanyAuditTrail(companyId, userId, userRole, options = {}) {
        if (userRole !== 'Administrator') {
            throw new Error('Access denied. Administrator role required to view company audit trail.');
        }
        
        return await this.getAuditLogs({
            companyId,
            includesSensitive: true,
            ...options
        });
    }
    
    // Core audit log retrieval with security filtering
    static async getAuditLogs(filters) {
        const whereClause = {
            companyId: filters.companyId
        };
        
        // Apply entity filtering
        if (filters.entityType) whereClause.entityType = filters.entityType;
        if (filters.entityId) whereClause.entityId = filters.entityId;
        if (filters.userId) whereClause.userId = filters.userId;
        
        // Security filtering based on user role
        if (filters.requestingUserRole !== 'Administrator') {
            // Non-admins cannot see sensitive audit logs
            whereClause.isSensitive = false;
            
            // Non-admins can only see audit logs for entities they have access to
            whereClause.entityType = {
                [Op.notIn]: this.HIGH_SECURITY_ENTITIES
            };
        }
        
        return await AuditLog.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: filters.limit || 50,
            offset: filters.offset || 0,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email', 'role']
                }
            ]
        });
    }
    
    // Calculate record hash for integrity verification
    static calculateRecordHash(record) {
        const crypto = require('crypto');
        const dataString = JSON.stringify({
            entityType: record.entityType,
            entityId: record.entityId,
            operation: record.operation,
            fieldName: record.fieldName,
            oldValue: record.oldValue,
            newValue: record.newValue,
            userId: record.userId,
            timestamp: new Date().toISOString()
        });
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }
    
    // Verify record integrity
    static async verifyRecordIntegrity(auditLogId) {
        const record = await AuditLog.findByPk(auditLogId);
        if (!record) return false;
        
        const expectedHash = this.calculateRecordHash(record);
        return record.recordHash === expectedHash;
    }

    // SESSION AND AUTHENTICATION TRACKING
    
    // Log user login
    static async logLogin(userId, companyId, sessionToken, contextInfo) {
        const { ipAddress, userAgent, loginMethod = 'password' } = contextInfo;
        
        // Create session record
        const session = await UserSession.create({
            userId,
            companyId,
            sessionToken,
            ipAddress,
            userAgent,
            loginMethod,
            deviceInfo: this.extractDeviceInfo(userAgent),
            locationInfo: await this.getLocationInfo(ipAddress)
        });

        // Log login event in audit log
        return await this.logChange({
            entityType: 'session',
            entityId: session.id,
            operation: 'LOGIN',
            userId,
            companyId,
            ipAddress,
            userAgent,
            sessionId: sessionToken,
            accessMethod: loginMethod,
            metadata: {
                sessionId: session.id,
                loginMethod,
                deviceInfo: session.deviceInfo
            }
        });
    }

    // Log user logout
    static async logLogout(userId, companyId, sessionToken, contextInfo = {}) {
        const { ipAddress, userAgent } = contextInfo;
        
        // Find and update session
        const session = await UserSession.findOne({
            where: { sessionToken, isActive: true }
        });

        if (session) {
            const sessionDuration = Math.floor((new Date() - session.loginAt) / 1000);
            
            // Update session record
            await session.update({
                logoutAt: new Date(),
                isActive: false,
                lastActivity: new Date()
            });

            // Log logout event in audit log
            return await this.logChange({
                entityType: 'session',
                entityId: session.id,
                operation: 'LOGOUT',
                userId,
                companyId,
                ipAddress,
                userAgent,
                sessionId: sessionToken,
                sessionDuration,
                metadata: {
                    sessionId: session.id,
                    sessionDuration: `${Math.floor(sessionDuration / 60)} minutes`,
                    logoutMethod: 'manual'
                }
            });
        }
    }

    // Log app access (when user opens app with existing cookie)
    static async logAppAccess(userId, companyId, sessionToken, contextInfo) {
        const { ipAddress, userAgent } = contextInfo;
        
        // Update session last activity
        await UserSession.update(
            { lastActivity: new Date() },
            { where: { sessionToken, isActive: true } }
        );

        // Log access event
        return await this.logChange({
            entityType: 'session',
            entityId: null,
            operation: 'ACCESS',
            userId,
            companyId,
            ipAddress,
            userAgent,
            sessionId: sessionToken,
            accessMethod: 'cookie_auth',
            metadata: {
                accessType: 'app_open',
                authMethod: 'existing_session'
            }
        });
    }

    // Log failed login attempt
    static async logFailedLogin(email, companyId, contextInfo, reason = 'invalid_credentials') {
        const { ipAddress, userAgent } = contextInfo;
        
        // Try to find user for logging (may not exist)
        const user = await User.findOne({ where: { email, companyId } });
        const userId = user ? user.id : null;

        return await this.logChange({
            entityType: 'auth',
            entityId: null,
            operation: 'FAILED_LOGIN',
            userId: userId || 0, // Use 0 for unknown users
            companyId: companyId || 0, // Use 0 if company unknown
            ipAddress,
            userAgent,
            metadata: {
                attemptedEmail: email,
                failureReason: reason,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Get user session history
    static async getUserSessionHistory(userId, requestingUserRole, options = {}) {
        // Only admins can view other users' session history
        if (options.targetUserId !== userId && requestingUserRole !== 'Administrator') {
            throw new Error('Access denied. Administrator role required to view other users\' session history.');
        }

        return await AuditLog.findAndCountAll({
            where: {
                userId,
                entityType: ['session', 'auth'],
                operation: ['LOGIN', 'LOGOUT', 'ACCESS', 'FAILED_LOGIN']
            },
            order: [['createdAt', 'DESC']],
            limit: options.limit || 50,
            offset: options.offset || 0
        });
    }

    // Get active sessions for user
    static async getActiveSessions(userId, requestingUserRole) {
        // Users can only see their own sessions unless admin
        if (userId !== requestingUserRole.userId && requestingUserRole.role !== 'Administrator') {
            throw new Error('Access denied. Can only view your own active sessions.');
        }

        return await UserSession.findAll({
            where: {
                userId,
                isActive: true
            },
            order: [['lastActivity', 'DESC']]
        });
    }

    // Terminate session (logout from specific device)
    static async terminateSession(sessionToken, userId, requestingUserRole) {
        const session = await UserSession.findOne({
            where: { sessionToken, isActive: true }
        });

        if (!session) {
            throw new Error('Session not found or already terminated.');
        }

        // Users can only terminate their own sessions unless admin
        if (session.userId !== userId && requestingUserRole.role !== 'Administrator') {
            throw new Error('Access denied. Can only terminate your own sessions.');
        }

        // Update session
        await session.update({
            isActive: false,
            logoutAt: new Date()
        });

        // Log forced logout
        return await this.logChange({
            entityType: 'session',
            entityId: session.id,
            operation: 'LOGOUT',
            userId: session.userId,
            companyId: session.companyId,
            sessionId: sessionToken,
            metadata: {
                logoutMethod: 'forced_termination',
                terminatedBy: userId
            }
        });
    }

    // Helper methods
    static extractDeviceInfo(userAgent) {
        // Simple device detection - could be enhanced with a library
        const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
        const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)?.[0] || 'Unknown';
        const os = userAgent.match(/(Windows|Mac|Linux|Android|iOS)[\s\w]*[\d._]*/)?.[0] || 'Unknown';
        
        return {
            isMobile,
            browser,
            os,
            userAgent: userAgent.substring(0, 255) // Truncate if too long
        };
    }

    static async getLocationInfo(ipAddress) {
        // Basic location detection - could integrate with IP geolocation service
        // For now, just return basic info
        return {
            ipAddress: ipAddress.toString(),
            // Could add: country, region, city, timezone
        };
    }
}
```

#### 2. Session Tracking Middleware
```javascript
// middleware/sessionTrackingMiddleware.js
const AuditService = require('../services/AuditService');

// Middleware to track app access via cookies
const trackAppAccess = async (req, res, next) => {
    try {
        // Only track if user is authenticated via cookie
        if (req.user && req.cookies.authToken) {
            const contextInfo = {
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent') || 'Unknown'
            };

            // Check if this is a "fresh" access (not just API calls)
            // Track main page loads, not every API call
            const isMainPageAccess = req.method === 'GET' && (
                req.path === '/' || 
                req.path.startsWith('/dashboard') ||
                req.path.startsWith('/contacts') ||
                req.path.startsWith('/leads')
            );

            if (isMainPageAccess) {
                // Don't await - log asynchronously to avoid blocking
                AuditService.logAppAccess(
                    req.user.id,
                    req.user.companyId,
                    req.cookies.authToken,
                    contextInfo
                ).catch(error => {
                    console.error('Error logging app access:', error);
                });
            }
        }
    } catch (error) {
        console.error('Session tracking middleware error:', error);
    }
    
    next();
};

// Middleware to update last activity timestamp
const updateLastActivity = async (req, res, next) => {
    try {
        if (req.user && req.cookies.authToken) {
            // Update last activity every 5 minutes max to avoid too many DB calls
            const lastUpdate = req.session?.lastActivityUpdate;
            const now = Date.now();
            
            if (!lastUpdate || (now - lastUpdate) > 5 * 60 * 1000) { // 5 minutes
                const UserSession = require('../models/UserSession');
                await UserSession.update(
                    { lastActivity: new Date() },
                    { 
                        where: { 
                            sessionToken: req.cookies.authToken,
                            isActive: true 
                        } 
                    }
                );
                
                if (req.session) {
                    req.session.lastActivityUpdate = now;
                }
            }
        }
    } catch (error) {
        console.error('Last activity update error:', error);
    }
    
    next();
};

module.exports = {
    trackAppAccess,
    updateLastActivity
};
```

#### 3. Enhanced Auth Routes Integration
```javascript
// routes/authRoutes.js - Enhanced with session tracking

// Login endpoint - enhanced
router.post('/login', async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;
        
        const contextInfo = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent') || 'Unknown'
        };

        // Find user and validate password (existing logic)
        const user = await User.findOne({ where: { email } });
        
        if (!user || !await bcrypt.compare(password, user.passwordHash)) {
            // Log failed login attempt
            await AuditService.logFailedLogin(email, user?.companyId, contextInfo);
            
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token (existing logic)
        const token = jwt.sign(
            { userId: user.id, companyId: user.companyId },
            process.env.JWT_SECRET,
            { expiresIn: rememberMe ? '30d' : '24h' }
        );

        // Set cookie (existing logic)
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
        });

        // LOG SUCCESSFUL LOGIN
        await AuditService.logLogin(user.id, user.companyId, token, {
            ...contextInfo,
            loginMethod: rememberMe ? 'remember_me' : 'password'
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                companyId: user.companyId
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// Logout endpoint - enhanced
router.post('/logout', protect, async (req, res) => {
    try {
        const contextInfo = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent') || 'Unknown'
        };

        // LOG LOGOUT
        if (req.cookies.authToken) {
            await AuditService.logLogout(
                req.user.id,
                req.user.companyId,
                req.cookies.authToken,
                contextInfo
            );
        }

        // Clear cookie (existing logic)
        res.clearCookie('authToken');
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

// Check auth status - enhanced with session tracking
router.get('/check', protect, async (req, res) => {
    try {
        // This endpoint is called when app loads with existing cookie
        // Log as app access if this is the first check in a while
        const contextInfo = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent') || 'Unknown'
        };

        // Check if this looks like a fresh app open
        const isAppOpen = req.get('Referer') === undefined || 
                         req.get('Referer').includes('login');

        if (isAppOpen && req.cookies.authToken) {
            // Don't await - log asynchronously
            AuditService.logAppAccess(
                req.user.id,
                req.user.companyId,
                req.cookies.authToken,
                contextInfo
            ).catch(error => {
                console.error('Error logging app access:', error);
            });
        }

        res.json({
            success: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role,
                companyId: req.user.companyId
            }
        });

    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication check failed'
        });
    }
});
```

#### 3. Model Hooks
```javascript
// Sequelize hooks for automatic audit logging
Model.addHook('afterCreate', (instance, options) => {
    AuditService.logChange({
        operation: 'CREATE',
        entityType: 'contact',
        entityId: instance.id,
        userId: options.userId,
        companyId: options.companyId,
        newValue: instance.toJSON()
    });
});
```

### Frontend Implementation

#### 1. Audit Components
```
frontend/src/components/audit/
├── AuditTimeline.js         # General timeline view of changes (reusable)
├── TimelineWithComments.js  # Combined timeline for Tasks/Tickets (changes + comments)
├── AuditEntry.js           # Individual change entry
├── AuditFilters.js         # Filter controls
├── AuditExport.js          # Export functionality
├── AuditSearch.js          # Search audit logs
└── AuditSummary.js         # Summary statistics
```

#### Component Specifications

##### AuditTimeline.js (General Purpose)
```javascript
// Reusable audit timeline component for any entity type
const AuditTimeline = ({ 
  entityType, 
  entityId, 
  userRole,
  showFilters = true,
  maxHeight = 'max-h-96',
  className = ''
}) => {
  // Features:
  // - Role-based access control for sensitive entities
  // - Date grouping with "Today", "Yesterday" labels
  // - Operation icons (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, ACCESS)
  // - Sensitive change indicators
  // - Filterable by operation type and date range
  // - Responsive design with scrollable container
  // - Loading and error states
  // - Device/browser info for session events
  // - Timestamp formatting (relative and absolute)
};
```

##### TimelineWithComments.js (Task/Ticket Specific)
```javascript
// Specialized timeline component for Tasks and Tickets based on the analyzed UI design
const TimelineWithComments = ({ 
  entityType, // 'task' or 'ticket'
  entityId,
  userRole,
  showAddComment = true,
  showFilters = false, // Keep minimal as per design
  maxHeight = 'h-full' // Full height as shown in design
}) => {
  // DESIGN SPECIFICATIONS (Based on analyzed image):
  // - Single column timeline on right side of screen
  // - Left side shows entity information panel
  // - Timeline entries with user avatars, names, actions, and timestamps
  // - Clean vertical line connecting timeline entries
  // - Rounded user profile images with colored backgrounds
  // - Clear action descriptions: "has changed the status to X", "has moved the ticket to Y"
  // - Timestamps in format: DD/MM/YYYY HH:MM
  // - Light background with subtle shadows for timeline entries
  
  // LAYOUT STRUCTURE:
  // ┌─────────────────────┬─────────────────────────────────┐
  // │ Entity Information  │ Timeline Activity               │
  // │ Panel              │                                 │
  // │ - Case Number      │ ○ User Avatar                   │
  // │ - Owner            │   Stefan Grozdanovski           │
  // │ - Status           │   has changed the status to     │
  // │ - Priority         │   Awaiting Change               │
  // │ - Subject          │   01/03/2025 21:50             │
  // │ - Description      │                                 │
  // │                    │ ○ User Avatar                   │
  // │                    │   Mateja Veljkovik              │
  // │                    │   has moved the ticket to       │
  // │                    │   Sales group                   │
  // │                    │   01/03/2025 21:50             │
  // └─────────────────────┴─────────────────────────────────┘
  
  // Features:
  // - Combines audit logs AND comments in chronological order
  // - Two-panel layout: Entity info (left) | Timeline (right)
  // - User avatars with colored backgrounds (auto-generated)
  // - Clear action descriptions matching the UI design language
  // - Precise timestamp formatting
  // - Visual timeline connector with dots/circles
  // - Responsive design that works in profile widget context
  
  // Implementation Plan:
  // Phase 1: Audit logs with exact design match
  // Phase 2: Add comments integration maintaining design consistency
  // Phase 3: Add filtering/search capabilities
  // Phase 4: Real-time updates and rich interactions
  
  // Data Sources:
  // - Audit logs: /api/audit-logs/entity/task/{id} or /api/audit-logs/entity/ticket/{id}
  // - Comments: /api/tasks/{id}/comments or /api/tickets/{id}/comments (future)
  
  // Timeline Item Types:
  // 1. AUDIT_LOG: Status changes, assignments, field updates
  //    - Format: "[User] has changed the [field] to [new_value]"
  //    - Format: "[User] has moved the [entity] to [new_value]"
  //    - Format: "[User] has assigned [entity] to [assignee]"
  // 2. COMMENT: User comments (future phase)
  //    - Format: "[User] commented on [entity]"
  // 3. SYSTEM: Automated events (future phase)
  //    - Format: "System automatically [action]"
};
```

##### Timeline Integration Examples
```javascript
// Usage in Task Profile Widget
<TimelineWithComments 
  entityType="task"
  entityId={taskId}
  userRole={user.role}
  showAddComment={true}
  showFilters={true}
/>

// Usage in Ticket Profile Widget  
<TimelineWithComments 
  entityType="ticket"
  entityId={ticketId}
  userRole={user.role}
  showAddComment={true}
  showFilters={true}
/>

// Usage in User Profile (admin only)
<AuditTimeline 
  entityType="user"
  entityId={userId}
  userRole={user.role}
  showFilters={true}
  className="admin-audit-view"
/>

// Usage in Company Settings (admin only)
<AuditTimeline 
  entityType="company"
  entityId={companyId}
  userRole={user.role}
  showFilters={true}
  className="company-audit-view"
/>
```

#### 2. Profile Widget Integration (With Role-Based Visibility)
```javascript
// Add Changes section to EntityWidget with role-based access
const entityConfig = {
    // ... existing config
    sections: [
        // ... existing sections
        {
            id: 'changes',
            title: 'Changes',
            component: 'AuditTimeline',
            permissions: ['read_audit_logs'],
            // Hide audit section for high-security entities if not admin
            visible: (entityType, userRole) => {
                const highSecurityEntities = ['user', 'company', 'system', 'security'];
                if (highSecurityEntities.includes(entityType)) {
                    return userRole === 'Administrator';
                }
                return true; // Show for all other entities
            }
        }
    ]
};

// Frontend component with role checking
const AuditTimeline = ({ entityType, entityId, userRole }) => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
        // Check if user has access to view audit logs for this entity type
        const highSecurityEntities = ['user', 'company', 'system', 'security'];
        if (highSecurityEntities.includes(entityType) && userRole !== 'Administrator') {
            setHasAccess(false);
            return;
        }
        
        setHasAccess(true);
        fetchAuditLogs();
    }, [entityType, entityId, userRole]);

    if (!hasAccess) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2">...</svg>
                    <p className="text-sm text-yellow-800">
                        Access denied. Administrator role required to view audit logs for this entity type.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="audit-timeline">
            {/* Render audit logs */}
        </div>
    );
};
```

## Implementation Phases

### Phase 1: Core Audit Infrastructure (Week 1-2)
**Backend**
- [ ] Create audit_logs table migration
- [ ] Implement AuditLog Sequelize model
- [ ] Create AuditService with core methods
- [ ] Add audit API routes
- [ ] Implement basic audit middleware

**Frontend**
- [ ] Create basic AuditTimeline component
- [ ] Create AuditEntry component for individual changes
- [ ] Add audit hooks (useAuditHistory)

**Testing**
- [ ] Unit tests for AuditService
- [ ] Integration tests for audit middleware
- [ ] Test audit logging for basic CRUD operations

### Phase 2: Automatic Change Tracking (Week 2-3)
**Backend Integration**
- [ ] Add audit hooks to all existing models
- [ ] Implement field-level change detection
- [ ] Add context capture (IP, user agent, session)
- [ ] Special handling for sensitive entities (Company, User)

**Enhanced Logging**
- [ ] Implement before/after value capture
- [ ] Add operation categorization
- [ ] Implement sensitive change flagging
- [ ] Add metadata enrichment

### Phase 3: Timeline Components & Profile Widget Integration (Week 3-4)
**Timeline Components**
- [ ] Create reusable AuditTimeline component
  - [ ] Role-based access control for sensitive entities
  - [ ] Date grouping with relative timestamps
  - [ ] Operation icons and status indicators
  - [ ] Filtering by operation type and date range
  - [ ] Loading and error states
  - [ ] Responsive design with scrollable container

- [ ] Create specialized TimelineWithComments component (UPDATED DESIGN)
  - [ ] Implement two-panel layout: Entity info (left) | Timeline (right)
  - [ ] Add user avatars with colored backgrounds (auto-generated)
  - [ ] Implement precise timestamp formatting (DD/MM/YYYY HH:MM)
  - [ ] Create visual timeline connector with dots/circles
  - [ ] Design clear action descriptions: "[User] has changed the [field] to [value]"
  - [ ] Add audit logs integration for tasks and tickets
  - [ ] Prepare structure for future comments integration
  - [ ] Ensure responsive design that works in profile widget context

**EntityWidget Integration**
- [ ] Add Changes section to all profile widgets
- [ ] Integrate AuditTimeline for general entities (contacts, leads, etc.)
- [ ] Integrate TimelineWithComments for tasks and tickets (with new design)
- [ ] Add role-based visibility controls
- [ ] Style timeline components consistently with existing design
- [ ] Implement entity information panel for task/ticket profile widgets

### Phase 4: Advanced Features (Week 4-5)
**Search & Export**
- [ ] Implement AuditSearch component
- [ ] Add advanced filtering (date range, user, field, operation)
- [ ] Implement audit log export (CSV, JSON)
- [ ] Add audit summary/statistics

**Security Enhancements**
- [ ] Implement audit log retention policies
- [ ] Add audit log integrity verification
- [ ] Implement audit log access permissions
- [ ] Add audit log anonymization for GDPR

### Phase 5: Admin Dashboard & Reporting (Week 5-6)
**Admin Features**
- [ ] Create audit dashboard page
- [ ] Implement company-wide audit reporting
- [ ] Add user activity monitoring
- [ ] Create security incident detection

**Business Intelligence**
- [ ] Add change frequency analytics
- [ ] Implement user productivity metrics
- [ ] Create data quality reporting
- [ ] Add compliance reporting features

## Security Considerations

### 1. Audit Log Integrity (ENFORCED AT MULTIPLE LEVELS)
- **Database-Level Immutability**: PostgreSQL triggers prevent any UPDATE/DELETE operations
- **Application-Level Protection**: AuditService only provides INSERT and SELECT methods
- **Cryptographic Hashing**: SHA-256 hash of each record for tamper detection
- **Role-Based Access**: High-security entity logs only visible to Administrators
- **Audit Trail of Audit Access**: Log who accessed audit logs and when
- **Backup Strategy**: Regular backups of audit logs to secure, append-only storage

### 2. Sensitive Data Handling
- **Field Masking**: Mask sensitive fields (passwords, SSNs) in audit logs
- **Encryption**: Encrypt sensitive audit data at rest
- **Retention Policies**: Automatic cleanup of old audit logs
- **GDPR Compliance**: Right to erasure handling for audit logs

### 3. Performance Optimization
- **Async Logging**: Audit logging shouldn't block main operations
- **Batch Processing**: Batch audit log writes for performance
- **Archival Strategy**: Move old audit logs to cold storage
- **Query Optimization**: Efficient indexes for audit queries

## API Endpoints (With Role-Based Access Control)

### Public Audit Endpoints (Role-Filtered)
```
GET    /api/audit-logs                    # List audit logs (filtered by user role)
GET    /api/audit-logs/:id               # Get specific audit log (if user has access)
GET    /api/audit-logs/entity/:type/:id  # Get entity change history (filtered by role)
GET    /api/audit-logs/export            # Export audit logs (filtered by role)
```

### Entity-Specific Audit (Role-Filtered)
```
GET    /api/contacts/:id/audit           # Contact change history (public)
GET    /api/leads/:id/audit              # Lead change history (public)
GET    /api/opportunities/:id/audit      # Opportunity change history (public)
GET    /api/tasks/:id/audit              # Task change history (public)
GET    /api/tickets/:id/audit            # Ticket change history (public)
```

### High-Security Entity Audit (ADMIN ONLY)
```
GET    /api/users/:id/audit              # User change history (ADMIN ONLY)
GET    /api/companies/:id/audit          # Company change history (ADMIN ONLY)
GET    /api/system/audit                 # System configuration changes (ADMIN ONLY)
GET    /api/security/audit               # Security-related changes (ADMIN ONLY)
```

### Session & Authentication Endpoints
```
GET    /api/sessions/my                  # Get my active sessions
GET    /api/sessions/history             # Get my session history
POST   /api/sessions/:token/terminate    # Terminate specific session
POST   /api/sessions/terminate-all       # Terminate all other sessions

# Admin-only session endpoints
GET    /api/admin/sessions/user/:id      # Get user's sessions (ADMIN ONLY)
GET    /api/admin/sessions/active        # Get all active sessions (ADMIN ONLY)
GET    /api/admin/sessions/failed-logins # Get failed login attempts (ADMIN ONLY)
POST   /api/admin/sessions/:token/force-logout # Force logout user (ADMIN ONLY)
```

### Admin-Only Endpoints
```
GET    /api/admin/audit/dashboard        # Audit dashboard data (ADMIN ONLY)
GET    /api/admin/audit/users/:id        # User activity report (ADMIN ONLY)
GET    /api/admin/audit/sensitive        # All sensitive audit logs (ADMIN ONLY)
GET    /api/admin/audit/integrity        # Verify audit log integrity (ADMIN ONLY)
POST   /api/admin/audit/retention        # Update retention policies (ADMIN ONLY)
```

### Middleware Protection Example
```javascript
// Route protection middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'Administrator') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Administrator role required.'
        });
    }
    next();
};

// Apply to sensitive routes
router.get('/users/:id/audit', protect, requireAdmin, getUserAuditHistory);
router.get('/companies/:id/audit', protect, requireAdmin, getCompanyAuditHistory);
router.get('/admin/audit/*', protect, requireAdmin, ...);
```

## Data Model Examples

### Contact Update Example
```json
{
    "id": 1,
    "entity_type": "contact",
    "entity_id": 123,
    "operation": "UPDATE",
    "user_id": 456,
    "company_id": 789,
    "field_name": "email",
    "old_value": "old@example.com",
    "new_value": "new@example.com",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2025-01-15T10:30:00Z",
    "is_sensitive": false
}
```

### User Role Change Example
```json
{
    "id": 2,
    "entity_type": "user",
    "entity_id": 456,
    "operation": "UPDATE",
    "user_id": 1,
    "company_id": 789,
    "field_name": "role",
    "old_value": "User",
    "new_value": "Administrator",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2025-01-15T10:35:00Z",
    "is_sensitive": true,
    "metadata": {
        "reason": "Promotion to admin role",
        "approved_by": 1
    }
}
```

### Company Settings Change Example
```json
{
    "id": 3,
    "entity_type": "company",
    "entity_id": 789,
    "operation": "UPDATE",
    "user_id": 1,
    "company_id": 789,
    "field_name": "ms365_integration",
    "old_value": null,
    "new_value": "{\"enabled\": true, \"tenant_id\": \"xxx\"}",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2025-01-15T10:40:00Z",
    "is_sensitive": true,
    "metadata": {
        "integration_type": "microsoft_365",
        "requires_approval": true
    }
}
```

### User Login Example
```json
{
    "id": 4,
    "entity_type": "session",
    "entity_id": 101,
    "operation": "LOGIN",
    "user_id": 456,
    "company_id": 789,
    "field_name": null,
    "old_value": null,
    "new_value": null,
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "session_id": "jwt_token_here",
    "access_method": "password",
    "created_at": "2025-01-15T09:00:00Z",
    "is_sensitive": true,
    "metadata": {
        "sessionId": 101,
        "loginMethod": "password",
        "deviceInfo": {
            "isMobile": false,
            "browser": "Chrome/120.0.0.0",
            "os": "Windows NT 10.0"
        }
    }
}
```

### User Logout Example
```json
{
    "id": 5,
    "entity_type": "session",
    "entity_id": 101,
    "operation": "LOGOUT",
    "user_id": 456,
    "company_id": 789,
    "field_name": null,
    "old_value": null,
    "new_value": null,
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "session_id": "jwt_token_here",
    "session_duration": 14400,
    "access_method": null,
    "created_at": "2025-01-15T13:00:00Z",
    "is_sensitive": true,
    "metadata": {
        "sessionId": 101,
        "sessionDuration": "240 minutes",
        "logoutMethod": "manual"
    }
}
```

### App Access via Cookie Example
```json
{
    "id": 6,
    "entity_type": "session",
    "entity_id": null,
    "operation": "ACCESS",
    "user_id": 456,
    "company_id": 789,
    "field_name": null,
    "old_value": null,
    "new_value": null,
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "session_id": "jwt_token_here",
    "access_method": "cookie_auth",
    "created_at": "2025-01-15T14:30:00Z",
    "is_sensitive": false,
    "metadata": {
        "accessType": "app_open",
        "authMethod": "existing_session"
    }
}
```

### Failed Login Example
```json
{
    "id": 7,
    "entity_type": "auth",
    "entity_id": null,
    "operation": "FAILED_LOGIN",
    "user_id": 0,
    "company_id": 789,
    "field_name": null,
    "old_value": null,
    "new_value": null,
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "session_id": null,
    "access_method": null,
    "created_at": "2025-01-15T15:45:00Z",
    "is_sensitive": true,
    "metadata": {
        "attemptedEmail": "attacker@example.com",
        "failureReason": "invalid_credentials",
        "timestamp": "2025-01-15T15:45:00.000Z"
    }
}
```

## UI/UX Design

### Timeline Component Designs

#### AuditTimeline (General Purpose)
```
┌─────────────────────────────────────────┐
│ Change History                   [⚙️][📤] │
├─────────────────────────────────────────┤
│ [All Operations ▼] [Last 30 days ▼]    │
├─────────────────────────────────────────┤
│ 📍 Today                                │
│ │  ✏️  John Doe updated email          │
│ │      10:30 AM • old@ex.com → new@ex.com│
│ │                                       │
│ │  👥  Jane Smith assigned task        │
│ │      9:15 AM • Status: pending       │
│ │                                       │
│ 📍 Yesterday                            │
│ │  🔒  Admin changed role               │
│ │      3:45 PM • User → Administrator   │
│ │      🔒 Sensitive change             │
└─────────────────────────────────────────┘
```

#### TimelineWithComments (Task/Ticket Specific - Based on Analyzed Design)
```
┌─────────────────────┬─────────────────────────────────┐
│ Entity Information  │ Timeline Activity               │
│                     │                                 │
│ Case Number         │ ●  Stefan Grozdanovski          │
│ 012345678901213     │    has changed the status to    │
│                     │    Awaiting Change              │
│ Case Owner          │    01/03/2025 21:50            │
│ Stefan G.           │                                 │
│                     │ │                               │
│ Status              │ ●  Mateja Veljkovik             │
│ On Hold             │    has moved the ticket to      │
│                     │    Sales group                  │
│ Priority            │    01/03/2025 21:50            │
│ Low                 │                                 │
│                     │ │                               │
│ Subject             │ ●  John Doe                     │
│ Lorem ipsum bla bla │    has assigned ticket to       │
│                     │    Stefan Grozdanovski          │
│ Description         │    01/03/2025 20:15            │
│ Lorem ipsum         │                                 │
│                     │ │                               │
│                     │ ●  System                       │
│                     │    created ticket               │
│                     │    01/03/2025 19:30            │
│                     │                                 │
│                     │ [Load More...] (if needed)      │
└─────────────────────┴─────────────────────────────────┘
```

#### Comment Integration (Future Phase)
```
┌─────────────────────────────────────────┐
│ 💬 Add Comment                          │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Type your comment...                │ │
│ │                                     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ [📎 Attach] [😀 Emoji] [Cancel] [Post] │
└─────────────────────────────────────────┘
```

### Sensitive Change Alert
```
┌─────────────────────────────────────────┐
│ ⚠️  Sensitive Change Alert              │
├─────────────────────────────────────────┤
│ User role changed from User to Admin    │
│                                         │
│ Changed by: System Administrator        │
│ Date: Jan 15, 2025 3:45 PM            │
│ IP: 192.168.1.1                       │
│                                         │
│ Reason: Promotion to admin role         │
│ Approved by: CEO                        │
│                                         │
│ [View Full Details] [Flag for Review]   │
└─────────────────────────────────────────┘
```

## Compliance & Business Benefits

### Compliance Benefits
- **SOX Compliance**: Financial data change tracking
- **GDPR Compliance**: Data processing audit trails
- **HIPAA**: Healthcare data access logging
- **Industry Standards**: ISO 27001, SOC 2 compliance

### Business Intelligence
- **User Productivity**: Track user activity and efficiency
- **Data Quality**: Monitor data completeness and accuracy
- **Process Optimization**: Identify workflow bottlenecks
- **Risk Management**: Detect unusual patterns or security threats

### Operational Benefits
- **Debugging**: Quick identification of when/who changed what
- **Customer Support**: Historical context for customer inquiries
- **Training**: Understanding user behavior patterns
- **Accountability**: Clear attribution of all changes

## Success Metrics

### Technical Metrics
- **Performance Impact**: <5ms additional latency for operations
- **Storage Efficiency**: Optimal audit log compression and archival
- **Query Performance**: <100ms for typical audit queries
- **System Reliability**: 99.9% audit log capture rate

### Business Metrics
- **User Adoption**: >80% of users viewing audit logs
- **Compliance Score**: 100% audit coverage for sensitive operations
- **Incident Resolution**: 50% faster debugging with audit trails
- **Data Quality**: Measurable improvement in data accuracy

## Future Enhancements

### Advanced Analytics
- **ML-Based Anomaly Detection**: Identify unusual change patterns
- **Predictive Analytics**: Forecast data quality issues
- **Behavioral Analytics**: User behavior pattern analysis
- **Risk Scoring**: Automated risk assessment for changes

### Integration Features
- **SIEM Integration**: Export audit logs to security systems
- **BI Tools**: Connect audit data to business intelligence platforms
- **Compliance Reporting**: Automated compliance report generation
- **API Webhooks**: Real-time audit event notifications

This comprehensive plan provides a robust foundation for accountability in your CRM system while delivering significant business value through change tracking and audit capabilities.