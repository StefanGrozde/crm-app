const AuditService = require('../services/AuditService');

/**
 * Generic audit middleware for capturing entity changes
 * This middleware automatically logs changes to entities
 */
const auditMiddleware = (entityType) => {
    return async (req, res, next) => {
        // Store original res.json method
        const originalJson = res.json;
        
        // Override res.json to capture successful operations
        res.json = function(data) {
            // Only log for successful operations
            if (data.success !== false && res.statusCode < 400) {
                // Async logging - don't block the response
                setImmediate(async () => {
                    try {
                        await logAuditChange(req, res, entityType, data);
                    } catch (error) {
                        console.error('Audit logging error:', error);
                        // Don't fail the request if audit logging fails
                    }
                });
            }
            
            // Call original res.json
            return originalJson.call(this, data);
        };
        
        next();
    };
};

/**
 * Log audit change based on HTTP method and request data
 */
async function logAuditChange(req, res, entityType, responseData) {
    try {
        // Skip if no user context
        if (!req.user) return;
        
        const operation = getOperationFromMethod(req.method);
        const entityId = getEntityIdFromRequest(req, responseData);
        
        // Skip certain operations that don't need logging
        if (!operation || !shouldLogOperation(req, operation)) return;
        
        const contextInfo = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent') || 'Unknown',
            sessionId: req.cookies?.authToken
        };
        
        // For UPDATE operations, try to capture field-level changes
        if (operation === 'UPDATE' && req.body) {
            await logFieldChanges(req, entityType, entityId, contextInfo);
        } else {
            // Log general operation
            await AuditService.logChange({
                entityType,
                entityId,
                operation,
                userId: req.user.id,
                companyId: req.user.companyId,
                newValue: operation === 'CREATE' ? req.body : null,
                ...contextInfo,
                metadata: {
                    endpoint: req.originalUrl,
                    method: req.method,
                    userAgent: contextInfo.userAgent.substring(0, 100)
                }
            });
        }
        
    } catch (error) {
        console.error('Error in audit logging:', error);
        // Don't throw - audit failures shouldn't break the main operation
    }
}

/**
 * Log field-level changes for UPDATE operations
 */
async function logFieldChanges(req, entityType, entityId, contextInfo) {
    try {
        // Get the model to fetch current values
        const modelMap = {
            'contact': require('../models/Contact'),
            'lead': require('../models/Lead'),
            'opportunity': require('../models/Opportunity'),
            'company': require('../models/Company'),
            'user': require('../models/User'),
            'task': require('../models/Task'),
            'ticket': require('../models/Ticket'),
            'sale': require('../models/Sale')
        };
        
        const Model = modelMap[entityType];
        if (!Model || !entityId) {
            // If we can't get field-level changes, log general update
            return await AuditService.logChange({
                entityType,
                entityId,
                operation: 'UPDATE',
                userId: req.user.id,
                companyId: req.user.companyId,
                newValue: req.body,
                ...contextInfo,
                metadata: {
                    endpoint: req.originalUrl,
                    method: req.method,
                    note: 'Field-level changes not captured'
                }
            });
        }
        
        // Fetch current entity state (before changes)
        const currentEntity = await Model.findByPk(entityId);
        if (!currentEntity) {
            return; // Entity doesn't exist, can't compare
        }
        
        const oldValues = currentEntity.toJSON();
        const newValues = req.body;
        
        // Compare fields and log changes
        const fieldsToIgnore = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at'];
        const changes = [];
        
        for (const [field, newValue] of Object.entries(newValues)) {
            if (fieldsToIgnore.includes(field)) continue;
            
            const oldValue = oldValues[field];
            
            // Only log if value actually changed
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push({
                    field,
                    oldValue,
                    newValue
                });
                
                // Log individual field change
                await AuditService.logChange({
                    entityType,
                    entityId,
                    operation: 'UPDATE',
                    userId: req.user.id,
                    companyId: req.user.companyId,
                    fieldName: field,
                    oldValue,
                    newValue,
                    ...contextInfo,
                    metadata: {
                        endpoint: req.originalUrl,
                        totalChanges: changes.length
                    }
                });
            }
        }
        
        // If no field-level changes detected but UPDATE was called, log general update
        if (changes.length === 0) {
            await AuditService.logChange({
                entityType,
                entityId,
                operation: 'UPDATE',
                userId: req.user.id,
                companyId: req.user.companyId,
                ...contextInfo,
                metadata: {
                    endpoint: req.originalUrl,
                    note: 'No field changes detected'
                }
            });
        }
        
    } catch (error) {
        console.error('Error logging field changes:', error);
        // Fall back to general update log
        await AuditService.logChange({
            entityType,
            entityId,
            operation: 'UPDATE',
            userId: req.user.id,
            companyId: req.user.companyId,
            newValue: req.body,
            ...contextInfo,
            metadata: {
                endpoint: req.originalUrl,
                error: 'Field-level tracking failed'
            }
        });
    }
}

/**
 * Get operation type from HTTP method
 */
function getOperationFromMethod(method) {
    const methodMap = {
        'POST': 'CREATE',
        'PUT': 'UPDATE',
        'PATCH': 'UPDATE',
        'DELETE': 'DELETE'
    };
    return methodMap[method];
}

/**
 * Extract entity ID from request
 */
function getEntityIdFromRequest(req, responseData) {
    // Try to get ID from URL params first
    if (req.params.id) {
        return parseInt(req.params.id);
    }
    
    // For CREATE operations, try to get ID from response data
    if (responseData && responseData.data && responseData.data.id) {
        return responseData.data.id;
    }
    
    // Try to get from request body
    if (req.body && req.body.id) {
        return req.body.id;
    }
    
    return null;
}

/**
 * Determine if operation should be logged
 */
function shouldLogOperation(req, operation) {
    // Skip GET requests (read operations)
    if (req.method === 'GET') return false;
    
    // Skip certain endpoints
    const skipEndpoints = [
        '/api/auth/check',
        '/api/auth/logout',
        '/api/search',
        '/api/audit-logs'
    ];
    
    return !skipEndpoints.some(endpoint => req.originalUrl.startsWith(endpoint));
}

/**
 * Session tracking middleware
 * Tracks app access via cookies and updates session activity
 */
const sessionTrackingMiddleware = async (req, res, next) => {
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
                req.path.startsWith('/leads') ||
                req.path.startsWith('/opportunities') ||
                req.path.startsWith('/tickets') ||
                req.path.startsWith('/tasks')
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

/**
 * Update last activity timestamp middleware
 * Updates session last activity every 5 minutes to avoid too many DB calls
 */
const updateLastActivityMiddleware = async (req, res, next) => {
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

/**
 * Enhanced auth middleware that also tracks authentication events
 */
const auditedAuthMiddleware = (originalAuthMiddleware) => {
    return async (req, res, next) => {
        // First run the original auth middleware
        originalAuthMiddleware(req, res, async (error) => {
            if (error) {
                // Authentication failed - log it
                try {
                    const contextInfo = {
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.get('User-Agent') || 'Unknown'
                    };
                    
                    // Extract attempted email from Authorization header or body
                    let attemptedEmail = 'unknown';
                    if (req.body && req.body.email) {
                        attemptedEmail = req.body.email;
                    }
                    
                    await AuditService.logFailedLogin(attemptedEmail, 0, contextInfo, 'invalid_token');
                } catch (auditError) {
                    console.error('Error logging failed auth:', auditError);
                }
                
                return next(error);
            }
            
            // Authentication successful - user is now available in req.user
            next();
        });
    };
};

module.exports = {
    auditMiddleware,
    sessionTrackingMiddleware,
    updateLastActivityMiddleware,
    auditedAuthMiddleware
};