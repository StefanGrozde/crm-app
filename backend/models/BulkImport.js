const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');
const Company = require('./Company');
const { addAuditHooks } = require('../utils/auditHooks');

const BulkImport = sequelize.define('BulkImport', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: User,
      key: 'id',
    },
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
    references: {
      model: Company,
      key: 'id',
    },
  },
  // File Information
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'file_name'
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'file_path'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'file_size'
  },
  fileType: {
    type: DataTypes.ENUM('csv', 'xlsx', 'json'),
    allowNull: false,
    field: 'file_type'
  },
  // Import Status & Progress
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false
  },
  totalRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_records'
  },
  processedRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'processed_records'
  },
  successfulRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'successful_records'
  },
  failedRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'failed_records'
  },
  skippedRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'skipped_records'
  },
  // Import Configuration
  importSettings: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'import_settings'
  },
  duplicateHandling: {
    type: DataTypes.ENUM('skip', 'overwrite', 'merge'),
    defaultValue: 'skip',
    field: 'duplicate_handling'
  },
  // Processing Details
  processingTimeSeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'processing_time_seconds'
  },
  errorSummary: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_summary'
  },
  warningSummary: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'warning_summary'
  },
  // Timestamps
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'started_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  // Soft delete
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  }
}, {
  tableName: 'bulk_imports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
  indexes: [
    {
      fields: ['user_id', 'company_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['file_type']
    },
    {
      fields: ['company_id', 'status']
    }
  ]
});

// Instance methods
BulkImport.prototype.getProgressPercentage = function() {
  if (this.totalRecords === 0) return 0;
  return Math.round((this.processedRecords / this.totalRecords) * 100);
};

BulkImport.prototype.getSuccessRate = function() {
  if (this.processedRecords === 0) return 0;
  return Math.round((this.successfulRecords / this.processedRecords) * 100);
};

BulkImport.prototype.isInProgress = function() {
  return ['pending', 'processing'].includes(this.status);
};

BulkImport.prototype.isCompleted = function() {
  return ['completed', 'completed_with_errors', 'failed', 'cancelled'].includes(this.status);
};

BulkImport.prototype.hasErrors = function() {
  return this.failedRecords > 0;
};

BulkImport.prototype.canRetry = function() {
  return ['failed', 'completed_with_errors'].includes(this.status);
};

BulkImport.prototype.markAsProcessing = function() {
  return this.update({
    status: 'processing',
    startedAt: new Date()
  });
};

BulkImport.prototype.markAsCompleted = function(hasErrors = false) {
  const processingTime = this.startedAt ? 
    Math.floor((Date.now() - this.startedAt.getTime()) / 1000) : 0;
    
  return this.update({
    status: hasErrors ? 'completed_with_errors' : 'completed',
    completedAt: new Date(),
    processingTimeSeconds: processingTime
  });
};

BulkImport.prototype.markAsFailed = function(errorMessage) {
  const processingTime = this.startedAt ? 
    Math.floor((Date.now() - this.startedAt.getTime()) / 1000) : 0;
    
  return this.update({
    status: 'failed',
    errorSummary: errorMessage,
    completedAt: new Date(),
    processingTimeSeconds: processingTime
  });
};

BulkImport.prototype.updateProgress = function(processed, successful, failed, skipped = 0) {
  return this.update({
    processedRecords: processed,
    successfulRecords: successful,
    failedRecords: failed,
    skippedRecords: skipped
  });
};

// Static methods
BulkImport.findByUserAndCompany = function(userId, companyId, options = {}) {
  return BulkImport.findAll({
    where: {
      userId,
      companyId,
      deletedAt: null,
      ...options.where
    },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

BulkImport.getStatsByUserAndCompany = function(userId, companyId) {
  return BulkImport.findAll({
    where: {
      userId,
      companyId,
      deletedAt: null
    },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('successful_records')), 'totalImported'],
      [sequelize.fn('AVG', sequelize.col('processing_time_seconds')), 'avgProcessingTime']
    ],
    group: ['status']
  });
};

// Define associations
BulkImport.associate = (models) => {
  BulkImport.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
  });
  
  BulkImport.belongsTo(models.Company, {
    foreignKey: 'companyId',
    as: 'company',
  });
  
  BulkImport.hasMany(models.BulkImportError, {
    foreignKey: 'bulkImportId',
    as: 'errors',
  });
  
  BulkImport.hasMany(models.BulkImportSuccess, {
    foreignKey: 'bulkImportId',
    as: 'successes',
  });
  
  BulkImport.hasMany(models.BulkImportStats, {
    foreignKey: 'bulkImportId',
    as: 'stats',
  });
};

// Add audit hooks for automatic change tracking
addAuditHooks(BulkImport, 'bulk_import', {
  sensitiveFields: ['file_path'], // Don't log full file paths
  customMetadata: (instance, operation, context) => ({
    fileName: instance ? instance.fileName : null,
    status: instance ? instance.status : null,
    totalRecords: instance ? instance.totalRecords : null,
    successfulRecords: instance ? instance.successfulRecords : null,
    failedRecords: instance ? instance.failedRecords : null
  })
});

module.exports = BulkImport;