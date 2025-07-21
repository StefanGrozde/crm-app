/**
 * Webhook Monitor Routes
 * API endpoints to manage the webhook monitoring service
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const webhookMonitorService = require('../services/WebhookMonitorService');

/**
 * GET /api/webhook-monitor/status
 * Get webhook monitor service status (Administrator only)
 */
router.get('/status', protect, authorize('Administrator'), async (req, res) => {
  try {
    const status = webhookMonitorService.getStatus();
    res.json({
      message: 'Webhook monitor status retrieved',
      status
    });
  } catch (error) {
    console.error('[WEBHOOK-MONITOR-API] Error getting status:', error);
    res.status(500).json({ error: 'Failed to get webhook monitor status' });
  }
});

/**
 * POST /api/webhook-monitor/check
 * Manually trigger a webhook health check (Administrator only)
 */
router.post('/check', protect, authorize('Administrator'), async (req, res) => {
  try {
    console.log(`[WEBHOOK-MONITOR-API] Manual check requested by user ${req.user.userId}`);
    
    const results = await webhookMonitorService.runManualCheck();
    
    res.json({
      message: 'Manual webhook health check completed',
      results
    });
  } catch (error) {
    console.error('[WEBHOOK-MONITOR-API] Error during manual check:', error);
    res.status(500).json({ error: 'Failed to run webhook health check' });
  }
});

/**
 * POST /api/webhook-monitor/force-recreate
 * Force recreation of all webhooks (emergency fix) (Administrator only)
 */
router.post('/force-recreate', protect, authorize('Administrator'), async (req, res) => {
  try {
    console.log(`[WEBHOOK-MONITOR-API] Force recreate requested by user ${req.user.userId}`);
    
    const results = await webhookMonitorService.forceRecreateAll();
    
    res.json({
      message: 'Force recreation of all webhooks completed',
      results
    });
  } catch (error) {
    console.error('[WEBHOOK-MONITOR-API] Error during force recreation:', error);
    res.status(500).json({ error: 'Failed to force recreate webhooks' });
  }
});

/**
 * POST /api/webhook-monitor/start
 * Start the webhook monitor service (Administrator only)
 */
router.post('/start', protect, authorize('Administrator'), async (req, res) => {
  try {
    webhookMonitorService.start();
    res.json({ message: 'Webhook monitor service started' });
  } catch (error) {
    console.error('[WEBHOOK-MONITOR-API] Error starting service:', error);
    res.status(500).json({ error: 'Failed to start webhook monitor service' });
  }
});

/**
 * POST /api/webhook-monitor/stop
 * Stop the webhook monitor service (Administrator only)
 */
router.post('/stop', protect, authorize('Administrator'), async (req, res) => {
  try {
    webhookMonitorService.stop();
    res.json({ message: 'Webhook monitor service stopped' });
  } catch (error) {
    console.error('[WEBHOOK-MONITOR-API] Error stopping service:', error);
    res.status(500).json({ error: 'Failed to stop webhook monitor service' });
  }
});

module.exports = router;