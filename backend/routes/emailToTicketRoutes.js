const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const EmailToTicketService = require('../services/EmailToTicketService');
const EmailConfiguration = require('../models/EmailConfiguration');
const EmailProcessing = require('../models/EmailProcessing');
const Company = require('../models/Company');
const Ticket = require('../models/Ticket');
const Contact = require('../models/Contact');
const crypto = require('crypto');

// Set up model associations
EmailConfiguration.belongsTo(Company, { foreignKey: 'companyId' });
EmailProcessing.belongsTo(EmailConfiguration, { foreignKey: 'emailConfigId' });
EmailProcessing.belongsTo(Company, { foreignKey: 'companyId' });
EmailProcessing.belongsTo(Ticket, { foreignKey: 'ticketId', required: false });
EmailProcessing.belongsTo(Contact, { foreignKey: 'contactId', required: false });

// Middleware to validate webhook requests
const validateWebhook = (req, res, next) => {
  const { validationToken } = req.query;
  
  // Microsoft Graph webhook validation
  if (validationToken) {
    console.log('[EMAIL-WEBHOOK] Validating webhook with token:', validationToken);
    return res.status(200).send(validationToken);
  }
  
  // For actual webhook notifications, validate the client state
  const notifications = req.body.value || [];
  for (const notification of notifications) {
    if (notification.clientState) {
      // Client state format: "companyId-emailConfigId"
      const [companyId, emailConfigId] = notification.clientState.split('-');
      if (!companyId || !emailConfigId) {
        console.error('[EMAIL-WEBHOOK] Invalid client state format:', notification.clientState);
        return res.status(400).json({ error: 'Invalid client state' });
      }
    }
  }
  
  next();
};

/**
 * POST /api/email-to-ticket/webhook
 * Webhook endpoint for Microsoft Graph email notifications
 */
router.post('/webhook', validateWebhook, async (req, res) => {
  try {
    console.log('[EMAIL-WEBHOOK] Received webhook notification:', JSON.stringify(req.body, null, 2));
    
    const notifications = req.body.value || [];
    
    if (notifications.length === 0) {
      console.log('[EMAIL-WEBHOOK] No notifications in webhook payload');
      return res.status(200).json({ message: 'No notifications to process' });
    }
    
    const results = [];
    
    for (const notification of notifications) {
      try {
        // Extract subscription ID from the notification
        const subscriptionId = notification.subscriptionId;
        
        if (!subscriptionId) {
          console.error('[EMAIL-WEBHOOK] No subscription ID in notification');
          results.push({ success: false, message: 'No subscription ID' });
          continue;
        }
        
        // Process the notification
        const result = await EmailToTicketService.processEmailWebhook(notification, subscriptionId);
        results.push(result);
        
      } catch (error) {
        console.error('[EMAIL-WEBHOOK] Error processing notification:', error);
        results.push({ success: false, message: error.message });
      }
    }
    
    // Return success even if some notifications failed
    res.status(200).json({ 
      message: 'Webhook processed', 
      results,
      processed: results.length,
      successful: results.filter(r => r.success).length
    });
    
  } catch (error) {
    console.error('[EMAIL-WEBHOOK] Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/email-to-ticket/configurations
 * Get email configurations for the user's company
 */
router.get('/configurations', protect, async (req, res) => {
  try {
    const { companyId } = req.user;
    
    const configurations = await EmailConfiguration.findAll({
      where: { companyId },
      order: [['createdAt', 'DESC']]
    });
    
    res.json(configurations);
    
  } catch (error) {
    console.error('[EMAIL-TO-TICKET] Error fetching configurations:', error);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

/**
 * POST /api/email-to-ticket/configurations
 * Create a new email configuration
 */
router.post('/configurations', protect, async (req, res) => {
  try {
    const { companyId } = req.user;
    const configData = { ...req.body, companyId };
    
    const configuration = await EmailConfiguration.create(configData);
    
    res.status(201).json(configuration);
    
  } catch (error) {
    console.error('[EMAIL-TO-TICKET] Error creating configuration:', error);
    res.status(500).json({ error: 'Failed to create configuration' });
  }
});

/**
 * PUT /api/email-to-ticket/configurations/:id
 * Update an email configuration
 */
router.put('/configurations/:id', protect, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    
    const configuration = await EmailConfiguration.findOne({
      where: { id, companyId }
    });
    
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    await configuration.update(req.body);
    
    res.json(configuration);
    
  } catch (error) {
    console.error('[EMAIL-TO-TICKET] Error updating configuration:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

/**
 * DELETE /api/email-to-ticket/configurations/:id
 * Delete an email configuration
 */
router.delete('/configurations/:id', protect, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    
    const configuration = await EmailConfiguration.findOne({
      where: { id, companyId },
      include: [{ model: Company }]
    });
    
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    // Delete webhook subscription if exists
    if (configuration.webhookSubscriptionId) {
      await EmailToTicketService.deleteWebhookSubscription(configuration, configuration.Company);
    }
    
    await configuration.destroy();
    
    res.json({ message: 'Configuration deleted successfully' });
    
  } catch (error) {
    console.error('[EMAIL-TO-TICKET] Error deleting configuration:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

/**
 * POST /api/email-to-ticket/configurations/:id/webhook
 * Create webhook subscription for an email configuration
 */
router.post('/configurations/:id/webhook', protect, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    
    const configuration = await EmailConfiguration.findOne({
      where: { id, companyId },
      include: [{ model: Company }]
    });
    
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    // Generate webhook notification URL
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://your-app.com';
    const notificationUrl = `${baseUrl}/api/email-to-ticket/webhook`;
    
    const result = await EmailToTicketService.createWebhookSubscription(
      configuration,
      configuration.Company,
      notificationUrl
    );
    
    if (result.success) {
      res.json({ message: 'Webhook subscription created successfully', subscription: result.subscription });
    } else {
      res.status(400).json({ error: result.message });
    }
    
  } catch (error) {
    console.error('[EMAIL-TO-TICKET] Error creating webhook subscription:', error);
    res.status(500).json({ error: 'Failed to create webhook subscription' });
  }
});

/**
 * PUT /api/email-to-ticket/configurations/:id/webhook
 * Renew webhook subscription for an email configuration
 */
router.put('/configurations/:id/webhook', protect, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    
    const configuration = await EmailConfiguration.findOne({
      where: { id, companyId },
      include: [{ model: Company }]
    });
    
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    const result = await EmailToTicketService.renewWebhookSubscription(
      configuration,
      configuration.Company
    );
    
    if (result.success) {
      res.json({ message: 'Webhook subscription renewed successfully' });
    } else {
      res.status(400).json({ error: result.message });
    }
    
  } catch (error) {
    console.error('[EMAIL-TO-TICKET] Error renewing webhook subscription:', error);
    res.status(500).json({ error: 'Failed to renew webhook subscription' });
  }
});

/**
 * DELETE /api/email-to-ticket/configurations/:id/webhook
 * Delete webhook subscription for an email configuration
 */
router.delete('/configurations/:id/webhook', protect, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    
    const configuration = await EmailConfiguration.findOne({
      where: { id, companyId },
      include: [{ model: Company }]
    });
    
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    const result = await EmailToTicketService.deleteWebhookSubscription(
      configuration,
      configuration.Company
    );
    
    if (result.success) {
      res.json({ message: 'Webhook subscription deleted successfully' });
    } else {
      res.status(400).json({ error: result.message });
    }
    
  } catch (error) {
    console.error('[EMAIL-TO-TICKET] Error deleting webhook subscription:', error);
    res.status(500).json({ error: 'Failed to delete webhook subscription' });
  }
});

/**
 * GET /api/email-to-ticket/processing
 * Get email processing history for the user's company
 */
router.get('/processing', protect, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { page = 1, limit = 20, status } = req.query;
    
    const offset = (page - 1) * limit;
    const where = { companyId };
    
    if (status) {
      where.processingStatus = status;
    }
    
    const { count, rows } = await EmailProcessing.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: EmailConfiguration },
        { model: Ticket, required: false },
        { model: Contact, required: false }
      ]
    });
    
    res.json({
      processing: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
    
  } catch (error) {
    console.error('[EMAIL-TO-TICKET] Error fetching processing history:', error);
    res.status(500).json({ error: 'Failed to fetch processing history' });
  }
});

/**
 * POST /api/email-to-ticket/processing/:id/retry
 * Retry failed email processing
 */
router.post('/processing/:id/retry', protect, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    
    const emailProcessing = await EmailProcessing.findOne({
      where: { id, companyId },
      include: [{ model: EmailConfiguration, include: [{ model: Company }] }]
    });
    
    if (!emailProcessing) {
      return res.status(404).json({ error: 'Email processing record not found' });
    }
    
    if (!emailProcessing.canRetry()) {
      return res.status(400).json({ error: 'Cannot retry this email processing' });
    }
    
    // Reset processing status
    emailProcessing.processingStatus = 'pending';
    emailProcessing.processingError = null;
    await emailProcessing.save();
    
    // Retry processing
    const result = await EmailToTicketService.processEmailNotification(
      emailProcessing.webhookData,
      emailProcessing.EmailConfiguration,
      emailProcessing.EmailConfiguration.Company
    );
    
    res.json({ message: 'Email processing retried', result });
    
  } catch (error) {
    console.error('[EMAIL-TO-TICKET] Error retrying email processing:', error);
    res.status(500).json({ error: 'Failed to retry email processing' });
  }
});

/**
 * GET /api/email-to-ticket/stats
 * Get email-to-ticket statistics for the user's company
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { days = 30 } = req.query;
    
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    
    const [
      totalProcessed,
      totalSuccessful,
      totalFailed,
      ticketsCreated,
      commentsAdded,
      ticketsReopened
    ] = await Promise.all([
      EmailProcessing.count({ where: { companyId, createdAt: { [require('sequelize').Op.gte]: since } } }),
      EmailProcessing.count({ where: { companyId, processingStatus: 'completed', createdAt: { [require('sequelize').Op.gte]: since } } }),
      EmailProcessing.count({ where: { companyId, processingStatus: 'failed', createdAt: { [require('sequelize').Op.gte]: since } } }),
      EmailProcessing.count({ where: { companyId, actionTaken: 'ticket_created', createdAt: { [require('sequelize').Op.gte]: since } } }),
      EmailProcessing.count({ where: { companyId, actionTaken: 'comment_added', createdAt: { [require('sequelize').Op.gte]: since } } }),
      EmailProcessing.count({ where: { companyId, actionTaken: 'ticket_reopened', createdAt: { [require('sequelize').Op.gte]: since } } })
    ]);
    
    res.json({
      period: `${days} days`,
      totalProcessed,
      totalSuccessful,
      totalFailed,
      successRate: totalProcessed > 0 ? ((totalSuccessful / totalProcessed) * 100).toFixed(1) : 0,
      actions: {
        ticketsCreated,
        commentsAdded,
        ticketsReopened
      }
    });
    
  } catch (error) {
    console.error('[EMAIL-TO-TICKET] Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;