/**
 * Webhook Monitor Service
 * Runs as part of the main application to monitor webhook health
 * Automatically checks and recreates expired Microsoft Graph webhooks
 */

const cron = require('node-cron');
const { Client } = require('@microsoft/microsoft-graph-client');
const msal = require('@azure/msal-node');
const EmailConfiguration = require('../models/EmailConfiguration');
const Company = require('../models/Company');
const EmailToTicketService = require('./EmailToTicketService');

// Set up associations
EmailConfiguration.belongsTo(Company, { foreignKey: 'companyId' });

class WebhookHealthMonitor {
  constructor() {
    this.results = {
      checked: 0,
      healthy: 0,
      renewed: 0,
      recreated: 0,
      failed: 0,
      errors: []
    };
  }

  async checkAllWebhooks() {
    try {
      console.log('🔍 [WEBHOOK-MONITOR] Starting webhook health check...');
      console.log('⏰ [WEBHOOK-MONITOR] Timestamp:', new Date().toISOString());

      // Reset results
      this.results = {
        checked: 0,
        healthy: 0,
        renewed: 0,
        recreated: 0,
        failed: 0,
        errors: []
      };

      // Get all active email configurations
      const emailConfigs = await EmailConfiguration.findAll({
        where: { 
          isActive: true,
          webhookSubscriptionId: { [require('sequelize').Op.ne]: null }
        },
        include: [{ model: Company }]
      });

      console.log(`📧 [WEBHOOK-MONITOR] Found ${emailConfigs.length} active email configurations with webhooks`);

      if (emailConfigs.length === 0) {
        console.log('ℹ️  [WEBHOOK-MONITOR] No active email configurations with webhooks found');
        return this.results;
      }

      // Check each configuration
      for (const config of emailConfigs) {
        await this.checkWebhookHealth(config);
      }

      // Log summary
      console.log(`🔍 [WEBHOOK-MONITOR] Check completed - Checked: ${this.results.checked}, Healthy: ${this.results.healthy}, Renewed: ${this.results.renewed}, Recreated: ${this.results.recreated}, Failed: ${this.results.failed}`);

      return this.results;

    } catch (error) {
      console.error('❌ [WEBHOOK-MONITOR] Error in webhook health monitor:', error);
      this.results.errors.push(error.message);
      return this.results;
    }
  }

  async checkWebhookHealth(emailConfig) {
    try {
      this.results.checked++;
      
      console.log(`\n🔍 [WEBHOOK-MONITOR] Checking webhook for: ${emailConfig.emailAddress}`);

      const company = emailConfig.Company;
      
      if (!company.emailEnabled) {
        console.log('⚠️  [WEBHOOK-MONITOR] Email not enabled for company, skipping...');
        return;
      }

      // Check if webhook is approaching expiration (within 12 hours)
      const expirationTime = new Date(emailConfig.webhookExpirationDateTime);
      const now = new Date();
      const hoursUntilExpiry = (expirationTime - now) / (1000 * 60 * 60);

      console.log(`⏳ [WEBHOOK-MONITOR] Hours until expiry: ${hoursUntilExpiry.toFixed(1)}`);

      // If expired or expiring within 12 hours, try to renew first
      if (hoursUntilExpiry <= 12) {
        console.log('🔄 [WEBHOOK-MONITOR] Webhook expiring soon, attempting renewal...');
        const renewed = await this.renewWebhook(emailConfig, company);
        
        if (renewed) {
          this.results.renewed++;
          console.log('✅ [WEBHOOK-MONITOR] Webhook renewed successfully');
          return;
        } else {
          console.log('⚠️  [WEBHOOK-MONITOR] Renewal failed, attempting recreation...');
          const recreated = await this.recreateWebhook(emailConfig, company);
          
          if (recreated) {
            this.results.recreated++;
            console.log('✅ [WEBHOOK-MONITOR] Webhook recreated successfully');
          } else {
            this.results.failed++;
            console.log('❌ [WEBHOOK-MONITOR] Failed to recreate webhook');
          }
          return;
        }
      }

      // If not expiring soon, test if the webhook actually exists at Microsoft
      console.log('🧪 [WEBHOOK-MONITOR] Testing webhook existence at Microsoft...');
      const exists = await this.testWebhookExists(emailConfig, company);
      
      if (exists) {
        this.results.healthy++;
        console.log('✅ [WEBHOOK-MONITOR] Webhook is healthy');
      } else {
        console.log('⚠️  [WEBHOOK-MONITOR] Webhook not found at Microsoft, recreating...');
        const recreated = await this.recreateWebhook(emailConfig, company);
        
        if (recreated) {
          this.results.recreated++;
          console.log('✅ [WEBHOOK-MONITOR] Webhook recreated successfully');
        } else {
          this.results.failed++;
          console.log('❌ [WEBHOOK-MONITOR] Failed to recreate webhook');
        }
      }

    } catch (error) {
      console.error(`❌ [WEBHOOK-MONITOR] Error checking webhook for ${emailConfig.emailAddress}:`, error.message);
      this.results.failed++;
      this.results.errors.push(`${emailConfig.emailAddress}: ${error.message}`);
    }
  }

  async testWebhookExists(emailConfig, company) {
    try {
      if (!emailConfig.webhookSubscriptionId) {
        return false;
      }

      // Configure MSAL
      const msalConfig = {
        auth: {
          clientId: company.ms365ClientId,
          authority: `https://login.microsoftonline.com/${company.ms365TenantId}`,
          clientSecret: company.ms365ClientSecret,
        },
      };

      const cca = new msal.ConfidentialClientApplication(msalConfig);

      // Acquire token
      const authResponse = await cca.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });

      if (!authResponse?.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      // Initialize Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, authResponse.accessToken);
        },
      });

      // Try to get the subscription
      await graphClient.api(`/subscriptions/${emailConfig.webhookSubscriptionId}`).get();
      
      return true; // If we get here, the subscription exists

    } catch (error) {
      if (error.statusCode === 404 || error.code === 'ResourceNotFound') {
        return false; // Subscription doesn't exist
      }
      
      // For other errors, we can't be sure, so assume it exists to avoid unnecessary recreation
      console.warn(`⚠️  [WEBHOOK-MONITOR] Could not verify webhook existence: ${error.message}`);
      return true;
    }
  }

  async renewWebhook(emailConfig, company) {
    try {
      const result = await EmailToTicketService.renewWebhookSubscription(emailConfig, company);
      return result.success;
    } catch (error) {
      console.warn(`⚠️  [WEBHOOK-MONITOR] Renewal failed: ${error.message}`);
      return false;
    }
  }

  async recreateWebhook(emailConfig, company) {
    try {
      // First, clean up the database (ignore errors)
      try {
        await EmailToTicketService.deleteWebhookSubscription(emailConfig, company);
      } catch (cleanupError) {
        console.log(`ℹ️  [WEBHOOK-MONITOR] Cleanup error (expected): ${cleanupError.message}`);
      }

      // Generate webhook notification URL
      const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://backend.svnikolaturs.mk';
      const notificationUrl = `${baseUrl}/api/email-to-ticket/webhook`;

      // Create new webhook
      const result = await EmailToTicketService.createWebhookSubscription(
        emailConfig,
        company,
        notificationUrl
      );

      return result.success;

    } catch (error) {
      console.error(`❌ [WEBHOOK-MONITOR] Recreation failed: ${error.message}`);
      return false;
    }
  }
}

class WebhookMonitorService {
  constructor() {
    this.monitor = new WebhookHealthMonitor();
    this.isRunning = false;
    this.lastRunTime = null;
    this.lastRunResults = null;
    this.cronJob = null;
  }

  /**
   * Start the webhook monitoring service
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Webhook monitor service is already running');
      return;
    }

    console.log('🚀 Starting Webhook Monitor Service...');
    console.log('📅 Schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)');

    // Schedule the cron job - every 6 hours
    // Format: minute hour day month dayOfWeek
    this.cronJob = cron.schedule('0 */6 * * *', async () => {
      await this.runHealthCheck();
    }, {
      scheduled: false, // Don't start immediately
      timezone: "UTC"
    });

    // Start the cron job
    this.cronJob.start();
    this.isRunning = true;

    console.log('✅ Webhook monitor service started successfully');
    
    // Run an initial check after 30 seconds to allow app to fully initialize
    setTimeout(() => {
      this.runHealthCheck();
    }, 30000);
  }

  /**
   * Stop the webhook monitoring service
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Webhook monitor service is not running');
      return;
    }

    console.log('🛑 Stopping Webhook Monitor Service...');
    
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    
    this.isRunning = false;
    console.log('✅ Webhook monitor service stopped');
  }

  /**
   * Run webhook health check
   */
  async runHealthCheck() {
    try {
      console.log('\n🔍 [WEBHOOK-MONITOR] Starting scheduled health check...');
      this.lastRunTime = new Date();

      const results = await this.monitor.checkAllWebhooks();
      this.lastRunResults = results;

      // Log summary for application logs
      console.log(`🔍 [WEBHOOK-MONITOR] Check completed - Checked: ${results.checked}, Healthy: ${results.healthy}, Renewed: ${results.renewed}, Recreated: ${results.recreated}, Failed: ${results.failed}`);

      if (results.failed > 0) {
        console.error(`⚠️  [WEBHOOK-MONITOR] ${results.failed} webhook(s) could not be fixed`);
        console.error(`❌ [WEBHOOK-MONITOR] Errors: ${results.errors.join(', ')}`);
      }

      return results;

    } catch (error) {
      console.error('💥 [WEBHOOK-MONITOR] Error during health check:', error);
      this.lastRunResults = {
        checked: 0,
        healthy: 0,
        renewed: 0,
        recreated: 0,
        failed: 1,
        errors: [error.message]
      };
      return this.lastRunResults;
    }
  }

  /**
   * Run health check manually (for API endpoint)
   */
  async runManualCheck() {
    console.log('🔧 [WEBHOOK-MONITOR] Manual health check requested...');
    return await this.runHealthCheck();
  }

  /**
   * Get service status
   */
  getStatus() {
    let nextRunTime = null;
    
    if (this.cronJob && this.isRunning) {
      try {
        // Use nextDate() method (singular) and handle potential errors
        const nextDate = this.cronJob.nextDate();
        nextRunTime = nextDate ? nextDate.toString() : null;
      } catch (error) {
        console.warn('[WEBHOOK-MONITOR] Could not get next run time:', error.message);
        nextRunTime = 'Unknown';
      }
    }
    
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      lastRunResults: this.lastRunResults,
      nextRunTime,
      schedule: 'Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)'
    };
  }

  /**
   * Force recreation of all webhooks (emergency fix)
   */
  async forceRecreateAll() {
    console.log('🚨 [WEBHOOK-MONITOR] EMERGENCY: Force recreating all webhooks...');
    
    // Override renewal to force recreation
    const originalRenewWebhook = this.monitor.renewWebhook;
    this.monitor.renewWebhook = async function() {
      console.log('🔧 Forcing recreation instead of renewal...');
      return false; // Force recreation
    };

    const results = await this.monitor.checkAllWebhooks();
    
    // Restore original method
    this.monitor.renewWebhook = originalRenewWebhook;
    
    return results;
  }
}

// Create singleton instance
const webhookMonitorService = new WebhookMonitorService();

module.exports = webhookMonitorService;