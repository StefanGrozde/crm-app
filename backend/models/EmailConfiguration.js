const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { addAuditHooks } = require('../utils/auditHooks');

const EmailConfiguration = sequelize.define('EmailConfiguration', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  companyId: {
    type: DataTypes.INTEGER,
    field: 'company_id',
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id',
    },
  },
  emailAddress: {
    type: DataTypes.STRING(255),
    field: 'email_address',
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    field: 'is_active',
    defaultValue: true,
    allowNull: false,
  },
  // Ticket creation settings
  defaultTicketType: {
    type: DataTypes.ENUM('bug', 'feature_request', 'support', 'question', 'task', 'incident'),
    field: 'default_ticket_type',
    defaultValue: 'support',
    allowNull: false,
  },
  defaultTicketPriority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    field: 'default_ticket_priority',
    defaultValue: 'medium',
    allowNull: false,
  },
  defaultAssignedTo: {
    type: DataTypes.INTEGER,
    field: 'default_assigned_to',
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  // Email processing rules
  subjectPrefix: {
    type: DataTypes.STRING(50),
    field: 'subject_prefix',
    allowNull: true,
    comment: 'Optional prefix to add to ticket titles'
  },
  autoResolveKeywords: {
    type: DataTypes.JSON,
    field: 'auto_resolve_keywords',
    defaultValue: [],
    allowNull: true,
    comment: 'Keywords that automatically resolve tickets'
  },
  ignoredSenders: {
    type: DataTypes.JSON,
    field: 'ignored_senders',
    defaultValue: [],
    allowNull: true,
    comment: 'Email addresses to ignore'
  },
  // Microsoft Graph webhook settings
  webhookSubscriptionId: {
    type: DataTypes.STRING(255),
    field: 'webhook_subscription_id',
    allowNull: true,
    comment: 'Microsoft Graph webhook subscription ID'
  },
  webhookExpirationDateTime: {
    type: DataTypes.DATE,
    field: 'webhook_expiration_datetime',
    allowNull: true,
    comment: 'When the webhook subscription expires'
  },
  webhookNotificationUrl: {
    type: DataTypes.STRING(500),
    field: 'webhook_notification_url',
    allowNull: true,
    comment: 'URL for receiving webhook notifications'
  },
  // Processing settings
  createTicketsForInternalEmails: {
    type: DataTypes.BOOLEAN,
    field: 'create_tickets_for_internal_emails',
    defaultValue: false,
    allowNull: false,
    comment: 'Whether to create tickets for emails from same domain'
  },
  requireContactMatch: {
    type: DataTypes.BOOLEAN,
    field: 'require_contact_match',
    defaultValue: false,
    allowNull: false,
    comment: 'Whether to require sender to be an existing contact'
  },
  autoCreateContacts: {
    type: DataTypes.BOOLEAN,
    field: 'auto_create_contacts',
    defaultValue: true,
    allowNull: false,
    comment: 'Whether to automatically create contacts for unknown senders'
  },
}, {
  tableName: 'email_configurations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['company_id']
    },
    {
      fields: ['email_address']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['webhook_subscription_id']
    },
    {
      unique: true,
      fields: ['company_id', 'email_address'],
      name: 'unique_company_email'
    }
  ]
});

// Virtual field to check if webhook is active
EmailConfiguration.prototype.isWebhookActive = function() {
  return this.webhookSubscriptionId && 
         this.webhookExpirationDateTime && 
         new Date(this.webhookExpirationDateTime) > new Date();
};

// Virtual field to check if webhook needs renewal
EmailConfiguration.prototype.needsWebhookRenewal = function() {
  if (!this.webhookExpirationDateTime) return true;
  
  const expirationDate = new Date(this.webhookExpirationDateTime);
  const renewalThreshold = new Date();
  renewalThreshold.setHours(renewalThreshold.getHours() + 24); // Renew 24 hours before expiration
  
  return expirationDate <= renewalThreshold;
};

// Virtual field to get configuration status
EmailConfiguration.prototype.getStatus = function() {
  if (!this.isActive) return 'inactive';
  if (!this.isWebhookActive()) return 'webhook_expired';
  if (this.needsWebhookRenewal()) return 'webhook_expiring';
  return 'active';
};

// Add audit hooks for automatic change tracking
addAuditHooks(EmailConfiguration, 'email_configuration', {
  sensitiveFields: ['isActive', 'webhookSubscriptionId', 'defaultAssignedTo'],
  customMetadata: (instance, operation, context) => ({
    emailAddress: instance?.emailAddress,
    isActive: instance?.isActive,
    hasWebhook: !!instance?.webhookSubscriptionId,
    status: instance?.getStatus?.()
  })
});

module.exports = EmailConfiguration;