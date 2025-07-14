const AuditLog = require('../models/AuditLog');
const UserSession = require('../models/UserSession');
const User = require('../models/User');
const { Op } = require('sequelize');
const crypto = require('crypto');

class AuditService {
    // Define high-security entities that require admin access
    static HIGH_SECURITY_ENTITIES = ['user', 'company', 'system', 'security'];
    
    /**
     * Log entity changes (WRITE-ONLY operation)
     * @param {Object} options - Audit log options
     * @param {string} options.entityType - Type of entity
     * @param {number} options.entityId - ID of entity (null for session events)
     * @param {string} options.operation - Operation type
     * @param {number} options.userId - User performing action
     * @param {number} options.companyId - Company context
     * @param {string} options.fieldName - Field being changed (optional)
     * @param {*} options.oldValue - Previous value (optional)
     * @param {*} options.newValue - New value (optional)
     * @param {string} options.ipAddress - IP address (optional)
     * @param {string} options.userAgent - User agent (optional)
     * @param {string} options.sessionId - Session identifier (optional)
     * @param {number} options.sessionDuration - Session duration in seconds (optional)
     * @param {string} options.accessMethod - Access method (optional)
     * @param {Object} options.metadata - Additional metadata (optional)
     */
    static async logChange(options) {
        try {
            // Calculate SHA-256 hash for record integrity
            const recordHash = this.calculateRecordHash(options);
            
            // Mark as sensitive if high-security entity
            const isSensitive = this.HIGH_SECURITY_ENTITIES.includes(options.entityType) ||
                               ['LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'ACCESS'].includes(options.operation);
            
            // Create audit log entry (INSERT ONLY - never update or delete)
            const auditLog = await AuditLog.create({
                entityType: options.entityType,
                entityId: options.entityId || null,
                operation: options.operation,
                userId: options.userId,
                companyId: options.companyId,
                fieldName: options.fieldName || null,
                oldValue: options.oldValue || null,
                newValue: options.newValue || null,
                ipAddress: options.ipAddress || null,
                userAgent: options.userAgent || null,
                sessionId: options.sessionId || null,
                sessionDuration: options.sessionDuration || null,
                accessMethod: options.accessMethod || null,
                metadata: options.metadata || {},
                isSensitive,
                recordHash
            });
            
            return auditLog;
        } catch (error) {
            console.error('Error logging audit change:', error);
            // Don't throw - audit logging should not break main operations
            return null;
        }
    }
    
    /**
     * Get change history for entity (with role-based filtering)
     */
    static async getEntityHistory(entityType, entityId, userId, userRole, options = {}) {
        try {
            // Check if user can view this entity type
            if (this.HIGH_SECURITY_ENTITIES.includes(entityType) && userRole !== 'Administrator') {
                throw new Error('Access denied. Administrator role required to view sensitive audit logs.');
            }
            
            return await AuditLog.getEntityHistory(entityType, entityId, {
                ...options,
                userRole
            });
        } catch (error) {
            console.error('Error getting entity history:', error);
            throw error;
        }
    }
    
    /**
     * Get user activity (admin only for sensitive entities)
     */
    static async getUserActivity(targetUserId, requestingUserId, requestingUserRole, options = {}) {
        try {
            return await AuditLog.getUserActivity(targetUserId, {
                ...options,
                requestingUserRole,
                requestingUserId
            });
        } catch (error) {
            console.error('Error getting user activity:', error);
            throw error;
        }
    }
    
    /**
     * Get company audit trail (admin only)
     */
    static async getCompanyAuditTrail(companyId, userId, userRole, options = {}) {
        try {
            if (userRole !== 'Administrator') {
                throw new Error('Access denied. Administrator role required to view company audit trail.');
            }
            
            const { limit = 50, offset = 0 } = options;
            
            return await AuditLog.findAndCountAll({
                where: { companyId },
                order: [['createdAt', 'DESC']],
                limit,
                offset,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'email', 'role'],
                        required: false
                    }
                ]
            });
        } catch (error) {
            console.error('Error getting company audit trail:', error);
            throw error;
        }
    }
    
    /**
     * Get recent activity for dashboard
     */
    static async getRecentActivity(companyId, userRole, options = {}) {
        try {
            return await AuditLog.getRecentActivity(companyId, {
                ...options,
                userRole
            });
        } catch (error) {
            console.error('Error getting recent activity:', error);
            throw error;
        }
    }
    
    /**
     * Calculate record hash for integrity verification
     */
    static calculateRecordHash(record) {
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
    
    /**
     * Verify record integrity
     */
    static async verifyRecordIntegrity(auditLogId) {
        try {
            const record = await AuditLog.findByPk(auditLogId);
            if (!record) return false;
            
            return record.verifyIntegrity();
        } catch (error) {
            console.error('Error verifying record integrity:', error);
            return false;
        }
    }

    // SESSION AND AUTHENTICATION TRACKING
    
    /**
     * Log user login
     */
    static async logLogin(userId, companyId, sessionToken, contextInfo) {
        try {
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
        } catch (error) {
            console.error('Error logging login:', error);
            return null;
        }
    }

    /**
     * Log user logout
     */
    static async logLogout(userId, companyId, sessionToken, contextInfo = {}) {
        try {
            const { ipAddress, userAgent } = contextInfo;
            
            // Find and update session
            const session = await UserSession.findOne({
                where: { sessionToken, isActive: true }
            });

            if (session) {
                const sessionDuration = session.getDuration();
                
                // Update session record
                await session.logout();

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
        } catch (error) {
            console.error('Error logging logout:', error);
            return null;
        }
    }

    /**
     * Log app access (when user opens app with existing cookie)
     */
    static async logAppAccess(userId, companyId, sessionToken, contextInfo) {
        try {
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
        } catch (error) {
            console.error('Error logging app access:', error);
            return null;
        }
    }

    /**
     * Log failed login attempt
     */
    static async logFailedLogin(email, companyId, contextInfo, reason = 'invalid_credentials') {
        try {
            const { ipAddress, userAgent } = contextInfo;
            
            // Try to find user for logging (may not exist)
            const user = await User.findOne({ where: { email, companyId } });
            const userId = user ? user.id : 0; // Use 0 for unknown users

            return await this.logChange({
                entityType: 'auth',
                entityId: null,
                operation: 'FAILED_LOGIN',
                userId,
                companyId: companyId || 0, // Use 0 if company unknown
                ipAddress,
                userAgent,
                metadata: {
                    attemptedEmail: email,
                    failureReason: reason,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error logging failed login:', error);
            return null;
        }
    }

    /**
     * Get user session history
     */
    static async getUserSessionHistory(userId, requestingUserRole, options = {}) {
        try {
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
        } catch (error) {
            console.error('Error getting user session history:', error);
            throw error;
        }
    }

    /**
     * Get active sessions for user
     */
    static async getActiveSessions(userId, requestingUser) {
        try {
            // Users can only see their own sessions unless admin
            if (userId !== requestingUser.id && requestingUser.role !== 'Administrator') {
                throw new Error('Access denied. Can only view your own active sessions.');
            }

            return await UserSession.getActiveSessions(userId, requestingUser.companyId);
        } catch (error) {
            console.error('Error getting active sessions:', error);
            throw error;
        }
    }

    /**
     * Terminate session (logout from specific device)
     */
    static async terminateSession(sessionToken, userId, requestingUser) {
        try {
            const session = await UserSession.findOne({
                where: { sessionToken, isActive: true }
            });

            if (!session) {
                throw new Error('Session not found or already terminated.');
            }

            // Users can only terminate their own sessions unless admin
            if (session.userId !== userId && requestingUser.role !== 'Administrator') {
                throw new Error('Access denied. Can only terminate your own sessions.');
            }

            // Terminate session and log it
            return await UserSession.terminateSession(sessionToken, requestingUser.id);
        } catch (error) {
            console.error('Error terminating session:', error);
            throw error;
        }
    }

    // Helper methods
    static extractDeviceInfo(userAgent) {
        if (!userAgent) return {};
        
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
        if (!ipAddress) return {};
        
        // Basic location detection - could integrate with IP geolocation service
        // For now, just return basic info
        return {
            ipAddress: ipAddress.toString()
            // Could add: country, region, city, timezone
        };
    }

    /**
     * Cleanup expired sessions
     */
    static async cleanupExpiredSessions(maxInactiveMinutes = 60) {
        try {
            return await UserSession.cleanupExpiredSessions(maxInactiveMinutes);
        } catch (error) {
            console.error('Error cleaning up expired sessions:', error);
            return null;
        }
    }

    /**
     * Get audit log statistics
     */
    static async getAuditStats(companyId, userRole) {
        try {
            const whereClause = { companyId };
            
            // Non-admins cannot see sensitive audit logs
            if (userRole !== 'Administrator') {
                whereClause.isSensitive = false;
            }
            
            const totalLogs = await AuditLog.count({ where: whereClause });
            const todayLogs = await AuditLog.count({
                where: {
                    ...whereClause,
                    createdAt: {
                        [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            });
            
            const operationStats = await AuditLog.findAll({
                where: whereClause,
                attributes: [
                    'operation',
                    [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
                ],
                group: ['operation'],
                order: [[AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'DESC']]
            });
            
            return {
                totalLogs,
                todayLogs,
                operationStats: operationStats.map(stat => ({
                    operation: stat.operation,
                    count: parseInt(stat.dataValues.count)
                }))
            };
        } catch (error) {
            console.error('Error getting audit stats:', error);
            throw error;
        }
    }
}

module.exports = AuditService;