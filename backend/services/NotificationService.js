const Notification = require('../models/Notification');
const User = require('../models/User');
const Task = require('../models/Task');
const Ticket = require('../models/Ticket');

class NotificationService {
  
  /**
   * Create a notification for a user
   */
  static async createNotification({
    userId,
    companyId,
    type,
    entityType,
    entityId,
    title,
    message,
    data = {}
  }) {
    try {
      const notification = await Notification.create({
        userId,
        companyId,
        type,
        entityType,
        entityId,
        title,
        message,
        data,
        isRead: false
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create task assignment notification
   */
  static async createTaskAssignmentNotification(task, assignedUserId, assignedByUser) {
    try {
      const assignedUser = await User.findByPk(assignedUserId);
      if (!assignedUser) return null;

      const title = 'New Task Assignment';
      const message = `You have been assigned a new task: "${task.title}" by ${assignedByUser.username}`;
      
      return await this.createNotification({
        userId: assignedUserId,
        companyId: task.companyId,
        type: 'assignment',
        entityType: 'task',
        entityId: task.id,
        title,
        message,
        data: {
          taskTitle: task.title,
          assignedBy: assignedByUser.username,
          priority: task.priority,
          dueDate: task.dueDate
        }
      });
    } catch (error) {
      console.error('Error creating task assignment notification:', error);
      throw error;
    }
  }

  /**
   * Create task status change notification
   */
  static async createTaskStatusChangeNotification(task, newStatus, changedByUser, assignedUserIds) {
    try {
      const notifications = [];
      
      for (const userId of assignedUserIds) {
        const title = 'Task Status Updated';
        const message = `Task "${task.title}" status changed to "${newStatus}" by ${changedByUser.username}`;
        
        const notification = await this.createNotification({
          userId,
          companyId: task.companyId,
          type: 'status_change',
          entityType: 'task',
          entityId: task.id,
          title,
          message,
          data: {
            taskTitle: task.title,
            newStatus,
            previousStatus: task.status,
            changedBy: changedByUser.username
          }
        });
        
        notifications.push(notification);
      }
      
      return notifications;
    } catch (error) {
      console.error('Error creating task status change notification:', error);
      throw error;
    }
  }

  /**
   * Create ticket assignment notification
   */
  static async createTicketAssignmentNotification(ticket, assignedUserId, assignedByUser) {
    try {
      const assignedUser = await User.findByPk(assignedUserId);
      if (!assignedUser) return null;

      const title = 'New Ticket Assignment';
      const message = `You have been assigned a new ticket: "${ticket.title}" by ${assignedByUser.username}`;
      
      return await this.createNotification({
        userId: assignedUserId,
        companyId: ticket.companyId,
        type: 'assignment',
        entityType: 'ticket',
        entityId: ticket.id,
        title,
        message,
        data: {
          ticketTitle: ticket.title,
          assignedBy: assignedByUser.username,
          priority: ticket.priority,
          status: ticket.status
        }
      });
    } catch (error) {
      console.error('Error creating ticket assignment notification:', error);
      throw error;
    }
  }

  /**
   * Create ticket status change notification
   */
  static async createTicketStatusChangeNotification(ticket, newStatus, changedByUser) {
    try {
      if (!ticket.assignedTo) return null;

      const title = 'Ticket Status Updated';
      const message = `Ticket "${ticket.title}" status changed to "${newStatus}" by ${changedByUser.username}`;
      
      return await this.createNotification({
        userId: ticket.assignedTo,
        companyId: ticket.companyId,
        type: 'status_change',
        entityType: 'ticket',
        entityId: ticket.id,
        title,
        message,
        data: {
          ticketTitle: ticket.title,
          newStatus,
          previousStatus: ticket.status,
          changedBy: changedByUser.username
        }
      });
    } catch (error) {
      console.error('Error creating ticket status change notification:', error);
      throw error;
    }
  }

  /**
   * Create ticket comment notification
   */
  static async createTicketCommentNotification(ticket, comment, commentedByUser) {
    try {
      if (!ticket.assignedTo || ticket.assignedTo === commentedByUser.id) return null;

      const title = 'New Comment on Ticket';
      const message = `${commentedByUser.username} added a comment to ticket "${ticket.title}"`;
      
      return await this.createNotification({
        userId: ticket.assignedTo,
        companyId: ticket.companyId,
        type: 'comment',
        entityType: 'ticket',
        entityId: ticket.id,
        title,
        message,
        data: {
          ticketTitle: ticket.title,
          commentedBy: commentedByUser.username,
          commentPreview: comment.content?.substring(0, 100) + (comment.content?.length > 100 ? '...' : '')
        }
      });
    } catch (error) {
      console.error('Error creating ticket comment notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user with pagination
   */
  static async getUserNotifications(userId, companyId, { 
    page = 1, 
    limit = 20, 
    unreadOnly = false 
  } = {}) {
    try {
      const offset = (page - 1) * limit;
      const whereClause = {
        userId,
        companyId
      };
      
      if (unreadOnly) {
        whereClause.isRead = false;
      }

      const { count, rows: notifications } = await Notification.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      return {
        notifications,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId, companyId) {
    try {
      return await Notification.count({
        where: {
          userId,
          companyId,
          isRead: false
        }
      });
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId, companyId) {
    try {
      const [updatedRows] = await Notification.update(
        { isRead: true, updatedAt: new Date() },
        {
          where: {
            id: notificationId,
            userId,
            companyId
          }
        }
      );
      
      return updatedRows > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId, companyId) {
    try {
      const [updatedRows] = await Notification.update(
        { isRead: true, updatedAt: new Date() },
        {
          where: {
            userId,
            companyId,
            isRead: false
          }
        }
      );
      
      return updatedRows;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId, userId, companyId) {
    try {
      const deletedRows = await Notification.destroy({
        where: {
          id: notificationId,
          userId,
          companyId
        }
      });
      
      return deletedRows > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  static async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const deletedRows = await Notification.destroy({
        where: {
          createdAt: {
            [require('sequelize').Op.lt]: thirtyDaysAgo
          },
          isRead: true
        }
      });
      
      console.log(`Cleaned up ${deletedRows} old notifications`);
      return deletedRows;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

}

module.exports = NotificationService;