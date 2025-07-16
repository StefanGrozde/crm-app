const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { addAuditHooks } = require('../utils/auditHooks');

const EmailProcessing = sequelize.define('EmailProcessing', {
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
  emailConfigId: {
    type: DataTypes.INTEGER,
    field: 'email_config_id',
    allowNull: false,
    references: {
      model: 'email_configurations',
      key: 'id',
    },
  },
  // Email identification
  messageId: {
    type: DataTypes.STRING(500),
    field: 'message_id',
    allowNull: false,
    unique: true,
    comment: 'Microsoft Graph message ID'
  },
  internetMessageId: {
    type: DataTypes.STRING(500),
    field: 'internet_message_id',
    allowNull: true,
    comment: 'Email Message-ID header for conversation threading'
  },
  conversationId: {
    type: DataTypes.STRING(500),
    field: 'conversation_id',
    allowNull: true,
    comment: 'Microsoft Graph conversation ID'
  },
  // Email metadata
  fromEmail: {
    type: DataTypes.STRING(255),
    field: 'from_email',
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  fromName: {
    type: DataTypes.STRING(255),
    field: 'from_name',
    allowNull: true,
  },
  subject: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  receivedDateTime: {
    type: DataTypes.DATE,
    field: 'received_datetime',
    allowNull: false,
    comment: 'When the email was received'
  },
  // Processing status
  processingStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'ignored'),
    field: 'processing_status',
    defaultValue: 'pending',
    allowNull: false,
  },
  processingError: {
    type: DataTypes.TEXT,
    field: 'processing_error',
    allowNull: true,
    comment: 'Error message if processing failed'
  },
  // Results
  ticketId: {
    type: DataTypes.INTEGER,
    field: 'ticket_id',
    allowNull: true,
    references: {
      model: 'tickets',
      key: 'id',
    },
    comment: 'Created ticket ID'
  },
  contactId: {
    type: DataTypes.INTEGER,
    field: 'contact_id',
    allowNull: true,
    references: {
      model: 'contacts',
      key: 'id',
    },
    comment: 'Associated contact ID'
  },
  actionTaken: {
    type: DataTypes.ENUM('ticket_created', 'comment_added', 'ticket_reopened', 'ignored', 'error'),
    field: 'action_taken',
    allowNull: true,
    comment: 'Action taken during processing'
  },
  // Conversation threading
  inReplyTo: {
    type: DataTypes.STRING(500),
    field: 'in_reply_to',
    allowNull: true,
    comment: 'In-Reply-To header for conversation threading'
  },
  references: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'References header for conversation threading'
  },
  parentTicketId: {
    type: DataTypes.INTEGER,
    field: 'parent_ticket_id',
    allowNull: true,
    references: {
      model: 'tickets',
      key: 'id',
    },
    comment: 'Parent ticket if this is a reply'
  },
  // Email content (for debugging/audit)
  emailBody: {
    type: DataTypes.TEXT,
    field: 'email_body',
    allowNull: true,
    comment: 'Email body content for debugging'
  },
  isHtml: {
    type: DataTypes.BOOLEAN,
    field: 'is_html',
    defaultValue: false,
    allowNull: false,
    comment: 'Whether email body is HTML'
  },
  // Webhook processing
  webhookData: {
    type: DataTypes.JSON,
    field: 'webhook_data',
    allowNull: true,
    comment: 'Raw webhook notification data'
  },
  processedAt: {
    type: DataTypes.DATE,
    field: 'processed_at',
    allowNull: true,
    comment: 'When the email was processed'
  },
  retryCount: {
    type: DataTypes.INTEGER,
    field: 'retry_count',
    defaultValue: 0,
    allowNull: false,
    comment: 'Number of processing retry attempts'
  },
  maxRetries: {
    type: DataTypes.INTEGER,
    field: 'max_retries',
    defaultValue: 3,
    allowNull: false,
    comment: 'Maximum number of retry attempts'
  },
}, {
  tableName: 'email_processing',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['company_id']
    },
    {
      fields: ['email_config_id']
    },
    {
      fields: ['message_id']
    },
    {
      fields: ['internet_message_id']
    },
    {
      fields: ['conversation_id']
    },
    {
      fields: ['from_email']
    },
    {
      fields: ['processing_status']
    },
    {
      fields: ['ticket_id']
    },
    {
      fields: ['parent_ticket_id']
    },
    {
      fields: ['received_datetime']
    },
    {
      fields: ['processed_at']
    },
    {
      fields: ['in_reply_to']
    }
  ]
});

// Virtual field to check if processing is complete
EmailProcessing.prototype.isProcessingComplete = function() {
  return ['completed', 'failed', 'ignored'].includes(this.processingStatus);
};

// Virtual field to check if processing failed
EmailProcessing.prototype.isProcessingFailed = function() {
  return this.processingStatus === 'failed';
};

// Virtual field to check if can retry
EmailProcessing.prototype.canRetry = function() {
  return this.isProcessingFailed() && this.retryCount < this.maxRetries;
};

// Virtual field to get processing duration
EmailProcessing.prototype.getProcessingDuration = function() {
  if (!this.processedAt) return null;
  
  const startTime = new Date(this.createdAt);
  const endTime = new Date(this.processedAt);
  return endTime - startTime; // Duration in milliseconds
};

// Virtual field to check if this is a reply
EmailProcessing.prototype.isReply = function() {
  return !!(this.inReplyTo || this.parentTicketId);
};

// Virtual field to get status display
EmailProcessing.prototype.getStatusDisplay = function() {
  const statusMap = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    ignored: 'Ignored'
  };
  return statusMap[this.processingStatus] || 'Unknown';
};

// Virtual field to get action display
EmailProcessing.prototype.getActionDisplay = function() {
  const actionMap = {
    ticket_created: 'Ticket Created',
    comment_added: 'Comment Added',
    ticket_reopened: 'Ticket Reopened',
    ignored: 'Ignored',
    error: 'Error'
  };
  return actionMap[this.actionTaken] || 'No Action';
};

// Method to mark as processing
EmailProcessing.prototype.markAsProcessing = function() {
  this.processingStatus = 'processing';
  this.processedAt = null;
  return this.save();
};

// Method to mark as completed
EmailProcessing.prototype.markAsCompleted = function(ticketId, contactId, actionTaken) {
  this.processingStatus = 'completed';
  this.processedAt = new Date();
  if (ticketId) this.ticketId = ticketId;
  if (contactId) this.contactId = contactId;
  if (actionTaken) this.actionTaken = actionTaken;
  return this.save();
};

// Method to mark as failed
EmailProcessing.prototype.markAsFailed = function(error) {
  this.processingStatus = 'failed';
  this.processedAt = new Date();
  this.processingError = error;
  this.retryCount += 1;
  return this.save();
};

// Method to mark as ignored
EmailProcessing.prototype.markAsIgnored = function(reason) {
  this.processingStatus = 'ignored';
  this.processedAt = new Date();
  this.processingError = reason;
  this.actionTaken = 'ignored';
  return this.save();
};

// Add audit hooks for automatic change tracking
addAuditHooks(EmailProcessing, 'email_processing', {
  sensitiveFields: ['processingStatus', 'ticketId', 'actionTaken'],
  customMetadata: (instance, operation, context) => ({
    messageId: instance?.messageId,
    fromEmail: instance?.fromEmail,
    subject: instance?.subject,
    processingStatus: instance?.processingStatus,
    actionTaken: instance?.actionTaken,
    hasTicket: !!instance?.ticketId,
    isReply: instance?.isReply?.(),
    retryCount: instance?.retryCount
  })
});

module.exports = EmailProcessing;