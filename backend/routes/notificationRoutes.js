const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const NotificationService = require('../services/NotificationService');

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications with pagination
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            unreadOnly = false 
        } = req.query;

        const result = await NotificationService.getUserNotifications(
            req.user.id, 
            req.user.companyId, 
            { 
                page: parseInt(page), 
                limit: parseInt(limit), 
                unreadOnly: unreadOnly === 'true' 
            }
        );

        res.json({
            success: true,
            data: result.notifications,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications for the user
 * @access  Private
 */
router.get('/unread-count', protect, async (req, res) => {
    try {
        const count = await NotificationService.getUnreadCount(
            req.user.id, 
            req.user.companyId
        );

        res.json({
            success: true,
            data: { count }
        });
    } catch (error) {
        console.error('Error fetching unread notification count:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching unread notification count',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a specific notification as read
 * @access  Private
 */
router.put('/:id/read', protect, async (req, res) => {
    try {
        const { id } = req.params;
        
        const success = await NotificationService.markAsRead(
            parseInt(id), 
            req.user.id, 
            req.user.companyId
        );

        if (success) {
            res.json({
                success: true,
                message: 'Notification marked as read'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking notification as read',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read for the user
 * @access  Private
 */
router.put('/read-all', protect, async (req, res) => {
    try {
        const updatedCount = await NotificationService.markAllAsRead(
            req.user.id, 
            req.user.companyId
        );

        res.json({
            success: true,
            message: `${updatedCount} notifications marked as read`,
            data: { updatedCount }
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking all notifications as read',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a specific notification
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        
        const success = await NotificationService.deleteNotification(
            parseInt(id), 
            req.user.id, 
            req.user.companyId
        );

        if (success) {
            res.json({
                success: true,
                message: 'Notification deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting notification',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/notifications/test
 * @desc    Test endpoint to check notifications functionality
 * @access  Private
 */
router.get('/test', protect, async (req, res) => {
    try {
        const Notification = require('../models/Notification');
        
        // Get total count of notifications for this user
        const totalCount = await Notification.count({
            where: {
                userId: req.user.id,
                companyId: req.user.companyId
            }
        });

        // Get recent notifications
        const recentNotifications = await Notification.findAll({
            where: {
                userId: req.user.id,
                companyId: req.user.companyId
            },
            order: [['createdAt', 'DESC']],
            limit: 5
        });

        res.json({
            success: true,
            data: {
                totalCount,
                recentNotifications,
                user: {
                    id: req.user.id,
                    companyId: req.user.companyId
                }
            }
        });
    } catch (error) {
        console.error('Error in notifications test:', error);
        res.status(500).json({
            success: false,
            message: 'Error testing notifications',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/notifications/cleanup
 * @desc    Clean up old read notifications (admin only)
 * @access  Private (Admin)
 */
router.post('/cleanup', protect, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Administrator') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const deletedCount = await NotificationService.cleanupOldNotifications();

        res.json({
            success: true,
            message: `${deletedCount} old notifications cleaned up`,
            data: { deletedCount }
        });
    } catch (error) {
        console.error('Error cleaning up notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Error cleaning up notifications',
            error: error.message
        });
    }
});

module.exports = router;