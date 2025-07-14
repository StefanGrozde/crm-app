const express = require('express');
const router = express.Router();
const AuditService = require('../services/AuditService');
const { protect } = require('../middleware/authMiddleware');

// Middleware to require admin role for sensitive routes
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'Administrator') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Administrator role required.'
        });
    }
    next();
};

// Public Audit Endpoints (Role-Filtered)

/**
 * GET /api/audit-logs
 * List audit logs (filtered by user role)
 */
router.get('/', protect, async (req, res) => {
    try {
        const { 
            limit = 50, 
            offset = 0, 
            entityType, 
            operation, 
            startDate, 
            endDate 
        } = req.query;
        
        const companyId = req.user.companyId;
        const userRole = req.user.role;
        
        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset)
        };
        
        // Apply filters
        const whereClause = { companyId };
        
        if (entityType) whereClause.entityType = entityType;
        if (operation) whereClause.operation = operation;
        
        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt[require('sequelize').Op.gte] = new Date(startDate);
            if (endDate) whereClause.createdAt[require('sequelize').Op.lte] = new Date(endDate);
        }
        
        // Security filtering based on user role
        if (userRole !== 'Administrator') {
            whereClause.isSensitive = false;
            whereClause.entityType = {
                [require('sequelize').Op.notIn]: AuditService.HIGH_SECURITY_ENTITIES
            };
        }
        
        const AuditLog = require('../models/AuditLog');
        const User = require('../models/User');
        
        const result = await AuditLog.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: options.limit,
            offset: options.offset,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email', 'role'],
                    required: false
                }
            ]
        });
        
        res.json({
            success: true,
            data: result.rows,
            total: result.count,
            pagination: {
                limit: options.limit,
                offset: options.offset,
                total: result.count,
                pages: Math.ceil(result.count / options.limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
            error: error.message
        });
    }
});

/**
 * GET /api/audit-logs/:id
 * Get specific audit log (if user has access)
 */
router.get('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user.role;
        const companyId = req.user.companyId;
        
        const AuditLog = require('../models/AuditLog');
        const User = require('../models/User');
        
        const auditLog = await AuditLog.findOne({
            where: { 
                id, 
                companyId 
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email', 'role'],
                    required: false
                }
            ]
        });
        
        if (!auditLog) {
            return res.status(404).json({
                success: false,
                message: 'Audit log not found'
            });
        }
        
        // Check access permissions
        if (auditLog.isSensitive && userRole !== 'Administrator') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Administrator role required to view sensitive audit logs.'
            });
        }
        
        if (AuditService.HIGH_SECURITY_ENTITIES.includes(auditLog.entityType) && userRole !== 'Administrator') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Administrator role required to view audit logs for this entity type.'
            });
        }
        
        res.json({
            success: true,
            data: auditLog
        });
        
    } catch (error) {
        console.error('Error fetching audit log:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit log',
            error: error.message
        });
    }
});

/**
 * GET /api/audit-logs/entity/:type/:id
 * Get entity change history (filtered by role)
 */
router.get('/entity/:type/:id', protect, async (req, res) => {
    try {
        const { type, id } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        console.log('Audit API called for:', { type, id, user: req.user.username, role: req.user.role });
        
        const result = await AuditService.getEntityHistory(
            type, 
            parseInt(id), 
            req.user.id, 
            req.user.role, 
            {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        );
        
        console.log('Audit result:', { count: result.count, rows: result.rows?.length });
        
        res.json({
            success: true,
            data: result.rows,
            total: result.count,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.count,
                pages: Math.ceil(result.count / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Error fetching entity history:', error);
        res.status(error.message.includes('Access denied') ? 403 : 500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/audit-logs/recent
 * Get recent activity for dashboard
 */
router.get('/recent', protect, async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const activities = await AuditService.getRecentActivity(
            req.user.companyId,
            req.user.role,
            { limit: parseInt(limit) }
        );
        
        res.json({
            success: true,
            data: activities
        });
        
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activity',
            error: error.message
        });
    }
});

/**
 * GET /api/audit-logs/stats
 * Get audit statistics
 */
router.get('/stats', protect, async (req, res) => {
    try {
        const stats = await AuditService.getAuditStats(req.user.companyId, req.user.role);
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Error fetching audit stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit statistics',
            error: error.message
        });
    }
});

// Session Management Endpoints

/**
 * GET /api/audit-logs/sessions/my
 * Get my active sessions
 */
router.get('/sessions/my', protect, async (req, res) => {
    try {
        const sessions = await AuditService.getActiveSessions(req.user.id, req.user);
        
        res.json({
            success: true,
            data: sessions
        });
        
    } catch (error) {
        console.error('Error fetching user sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sessions',
            error: error.message
        });
    }
});

/**
 * GET /api/audit-logs/sessions/history
 * Get my session history
 */
router.get('/sessions/history', protect, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        
        const result = await AuditService.getUserSessionHistory(
            req.user.id,
            req.user.role,
            {
                limit: parseInt(limit),
                offset: parseInt(offset),
                targetUserId: req.user.id
            }
        );
        
        res.json({
            success: true,
            data: result.rows,
            total: result.count,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.count,
                pages: Math.ceil(result.count / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Error fetching session history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch session history',
            error: error.message
        });
    }
});

/**
 * POST /api/audit-logs/sessions/:token/terminate
 * Terminate specific session
 */
router.post('/sessions/:token/terminate', protect, async (req, res) => {
    try {
        const { token } = req.params;
        
        await AuditService.terminateSession(token, req.user.id, req.user);
        
        res.json({
            success: true,
            message: 'Session terminated successfully'
        });
        
    } catch (error) {
        console.error('Error terminating session:', error);
        res.status(error.message.includes('Access denied') ? 403 : 500).json({
            success: false,
            message: error.message
        });
    }
});

// Admin-Only Endpoints

/**
 * GET /api/audit-logs/admin/users/:id/activity
 * Get user activity report (ADMIN ONLY)
 */
router.get('/admin/users/:id/activity', protect, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const result = await AuditService.getUserActivity(
            parseInt(id),
            req.user.id,
            req.user.role,
            {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        );
        
        res.json({
            success: true,
            data: result.rows,
            total: result.count,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.count,
                pages: Math.ceil(result.count / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/audit-logs/admin/company/trail
 * Get company audit trail (ADMIN ONLY)
 */
router.get('/admin/company/trail', protect, requireAdmin, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        
        const result = await AuditService.getCompanyAuditTrail(
            req.user.companyId,
            req.user.id,
            req.user.role,
            {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        );
        
        res.json({
            success: true,
            data: result.rows,
            total: result.count,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.count,
                pages: Math.ceil(result.count / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Error fetching company audit trail:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/audit-logs/admin/sessions/user/:id
 * Get user's sessions (ADMIN ONLY)
 */
router.get('/admin/sessions/user/:id', protect, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const result = await AuditService.getUserSessionHistory(
            parseInt(id),
            req.user.role,
            {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        );
        
        res.json({
            success: true,
            data: result.rows,
            total: result.count,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.count,
                pages: Math.ceil(result.count / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Error fetching user session history:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/audit-logs/admin/sessions/active
 * Get all active sessions (ADMIN ONLY)
 */
router.get('/admin/sessions/active', protect, requireAdmin, async (req, res) => {
    try {
        const UserSession = require('../models/UserSession');
        
        const sessions = await UserSession.getActiveSessionsForCompany(req.user.companyId);
        
        res.json({
            success: true,
            data: sessions
        });
        
    } catch (error) {
        console.error('Error fetching active sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active sessions',
            error: error.message
        });
    }
});

/**
 * POST /api/audit-logs/admin/sessions/:token/force-logout
 * Force logout user (ADMIN ONLY)
 */
router.post('/admin/sessions/:token/force-logout', protect, requireAdmin, async (req, res) => {
    try {
        const { token } = req.params;
        const UserSession = require('../models/UserSession');
        
        await UserSession.terminateSession(token, req.user.id);
        
        res.json({
            success: true,
            message: 'User session terminated successfully'
        });
        
    } catch (error) {
        console.error('Error force-logging out user:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/audit-logs/admin/cleanup-sessions
 * Cleanup expired sessions (ADMIN ONLY)
 */
router.post('/admin/cleanup-sessions', protect, requireAdmin, async (req, res) => {
    try {
        const { maxInactiveMinutes = 60 } = req.body;
        
        const result = await AuditService.cleanupExpiredSessions(maxInactiveMinutes);
        
        res.json({
            success: true,
            message: 'Expired sessions cleaned up successfully',
            sessionsTerminated: result[0] || 0
        });
        
    } catch (error) {
        console.error('Error cleaning up sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup sessions',
            error: error.message
        });
    }
});

/**
 * GET /api/audit-logs/admin/integrity/:id
 * Verify audit log integrity (ADMIN ONLY)
 */
router.get('/admin/integrity/:id', protect, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const isValid = await AuditService.verifyRecordIntegrity(parseInt(id));
        
        res.json({
            success: true,
            data: {
                auditLogId: parseInt(id),
                integrityValid: isValid
            }
        });
        
    } catch (error) {
        console.error('Error verifying integrity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify integrity',
            error: error.message
        });
    }
});

module.exports = router;