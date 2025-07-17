const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BulkImportError = sequelize.define('BulkImportError', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  bulkImportId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'bulk_import_id',
    references: {
      model: 'bulk_imports',
      key: 'id',
    },
  },
  // Error Details
  rowNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'row_number'
  },
  fieldName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'field_name'
  },
  errorType: {
    type: DataTypes.ENUM(
      'validation',
      'duplicate', 
      'format',
      'required',
      'invalid_email',
      'invalid_phone',
      'invalid_date',
      'invalid_enum',
      'length_exceeded',
      'system',
      'database',
      'unknown'
    ),
    allowNull: false,
    field: 'error_type'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'error_message'
  },
  errorCode: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'error_code'
  },
  // Data Context
  rowData: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'row_data'
  },
  suggestedFix: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'suggested_fix'
  },
  // Error Status
  isResolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_resolved'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resolved_at'
  }
}, {
  tableName: 'bulk_import_errors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      fields: ['bulk_import_id']
    },
    {
      fields: ['error_type']
    },
    {
      fields: ['bulk_import_id', 'row_number']
    },
    {
      fields: ['field_name']
    },
    {
      fields: ['is_resolved']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
BulkImportError.prototype.markAsResolved = function() {
  return this.update({
    isResolved: true,
    resolvedAt: new Date()
  });
};

BulkImportError.prototype.getSeverityLevel = function() {
  const severityMap = {
    'system': 'critical',
    'database': 'critical',
    'required': 'high',
    'validation': 'medium',
    'format': 'medium',
    'duplicate': 'low',
    'invalid_email': 'medium',
    'invalid_phone': 'medium',
    'invalid_date': 'medium',
    'invalid_enum': 'medium',
    'length_exceeded': 'low',
    'unknown': 'medium'
  };
  
  return severityMap[this.errorType] || 'medium';
};

BulkImportError.prototype.getFixSuggestion = function() {
  if (this.suggestedFix) {
    return this.suggestedFix;
  }
  
  // Generate default suggestions based on error type
  const suggestions = {
    'validation': `Check that ${this.fieldName} meets the required format`,
    'duplicate': 'This record already exists, consider updating instead',
    'format': `Fix the format of ${this.fieldName}`,
    'required': `${this.fieldName} is required and cannot be empty`,
    'invalid_email': 'Provide a valid email address',
    'invalid_phone': 'Provide a valid phone number',
    'invalid_date': 'Use a valid date format (YYYY-MM-DD)',
    'invalid_enum': `${this.fieldName} must be one of the allowed values`,
    'length_exceeded': `${this.fieldName} is too long`,
    'system': 'Contact system administrator',
    'database': 'Contact system administrator',
    'unknown': 'Review the data and try again'
  };
  
  return suggestions[this.errorType] || 'Review the data and try again';
};

// Static methods
BulkImportError.findByImportId = function(bulkImportId, options = {}) {
  return BulkImportError.findAll({
    where: {
      bulkImportId,
      ...options.where
    },
    order: [['rowNumber', 'ASC']],
    ...options
  });
};

BulkImportError.getErrorStatsByImportId = function(bulkImportId) {
  return BulkImportError.findAll({
    where: { bulkImportId },
    attributes: [
      'errorType',
      'fieldName',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['errorType', 'fieldName'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
  });
};

BulkImportError.getCommonErrors = function(bulkImportId) {
  return BulkImportError.findAll({
    where: { bulkImportId },
    attributes: [
      'errorType',
      'errorMessage',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['errorType', 'errorMessage'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
    limit: 10
  });
};

BulkImportError.bulkCreateErrors = function(errors) {
  return BulkImportError.bulkCreate(errors, {
    ignoreDuplicates: true,
    returning: true
  });
};

// Define associations
BulkImportError.associate = (models) => {
  BulkImportError.belongsTo(models.BulkImport, {
    foreignKey: 'bulkImportId',
    as: 'bulkImport',
  });
};

module.exports = BulkImportError;