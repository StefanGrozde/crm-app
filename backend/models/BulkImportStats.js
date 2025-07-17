const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BulkImportStats = sequelize.define('BulkImportStats', {
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
  // Field-level statistics
  fieldName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'field_name'
  },
  totalValues: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_values'
  },
  validValues: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'valid_values'
  },
  invalidValues: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'invalid_values'
  },
  emptyValues: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'empty_values'
  },
  // Additional statistics
  uniqueValues: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'unique_values'
  },
  duplicateValues: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'duplicate_values'
  },
  // Common errors and patterns
  commonErrors: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'common_errors'
  },
  valuePatterns: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'value_patterns'
  },
  // Performance metrics
  processingTimeMs: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'processing_time_ms'
  }
}, {
  tableName: 'bulk_import_stats',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      fields: ['bulk_import_id']
    },
    {
      fields: ['field_name']
    },
    {
      fields: ['bulk_import_id', 'field_name']
    },
    {
      fields: ['created_at']
    },
    {
      unique: true,
      fields: ['bulk_import_id', 'field_name']
    }
  ]
});

// Instance methods
BulkImportStats.prototype.getValidationRate = function() {
  if (this.totalValues === 0) return 100;
  return Math.round((this.validValues / this.totalValues) * 100);
};

BulkImportStats.prototype.getErrorRate = function() {
  if (this.totalValues === 0) return 0;
  return Math.round((this.invalidValues / this.totalValues) * 100);
};

BulkImportStats.prototype.getEmptyRate = function() {
  if (this.totalValues === 0) return 0;
  return Math.round((this.emptyValues / this.totalValues) * 100);
};

BulkImportStats.prototype.getUniquenessRate = function() {
  if (this.totalValues === 0) return 100;
  return Math.round((this.uniqueValues / this.totalValues) * 100);
};

BulkImportStats.prototype.getQualityScore = function() {
  // Calculate overall quality score based on validation rate and uniqueness
  const validationScore = this.getValidationRate();
  const uniquenessScore = this.getUniquenessRate();
  const emptyPenalty = this.getEmptyRate() * 0.5; // Empty values reduce quality by 50%
  
  return Math.max(0, Math.round((validationScore + uniquenessScore) / 2 - emptyPenalty));
};

BulkImportStats.prototype.getTopErrors = function(limit = 5) {
  if (!this.commonErrors || this.commonErrors.length === 0) return [];
  
  return this.commonErrors
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

BulkImportStats.prototype.addError = function(errorType, errorMessage) {
  const commonErrors = this.commonErrors || [];
  const existingError = commonErrors.find(e => e.type === errorType && e.message === errorMessage);
  
  if (existingError) {
    existingError.count++;
  } else {
    commonErrors.push({
      type: errorType,
      message: errorMessage,
      count: 1
    });
  }
  
  this.commonErrors = commonErrors;
};

BulkImportStats.prototype.addValuePattern = function(pattern, count) {
  const valuePatterns = this.valuePatterns || {};
  valuePatterns[pattern] = count;
  this.valuePatterns = valuePatterns;
};

// Static methods
BulkImportStats.findByImportId = function(bulkImportId, options = {}) {
  return BulkImportStats.findAll({
    where: {
      bulkImportId,
      ...options.where
    },
    order: [['fieldName', 'ASC']],
    ...options
  });
};

BulkImportStats.getOverallStats = function(bulkImportId) {
  return BulkImportStats.findOne({
    where: { bulkImportId },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('total_values')), 'totalValues'],
      [sequelize.fn('SUM', sequelize.col('valid_values')), 'validValues'],
      [sequelize.fn('SUM', sequelize.col('invalid_values')), 'invalidValues'],
      [sequelize.fn('SUM', sequelize.col('empty_values')), 'emptyValues'],
      [sequelize.fn('SUM', sequelize.col('unique_values')), 'uniqueValues'],
      [sequelize.fn('SUM', sequelize.col('duplicate_values')), 'duplicateValues'],
      [sequelize.fn('AVG', sequelize.col('processing_time_ms')), 'avgProcessingTime'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'fieldsProcessed']
    ]
  });
};

BulkImportStats.getFieldQualityReport = function(bulkImportId) {
  return BulkImportStats.findAll({
    where: { bulkImportId },
    attributes: [
      'fieldName',
      'totalValues',
      'validValues',
      'invalidValues',
      'emptyValues',
      'uniqueValues',
      'duplicateValues',
      'commonErrors',
      [sequelize.literal('CASE WHEN total_values > 0 THEN ROUND((valid_values::float / total_values) * 100, 2) ELSE 100 END'), 'validationRate'],
      [sequelize.literal('CASE WHEN total_values > 0 THEN ROUND((invalid_values::float / total_values) * 100, 2) ELSE 0 END'), 'errorRate'],
      [sequelize.literal('CASE WHEN total_values > 0 THEN ROUND((empty_values::float / total_values) * 100, 2) ELSE 0 END'), 'emptyRate']
    ],
    order: [['fieldName', 'ASC']]
  });
};

BulkImportStats.createFieldStats = function(bulkImportId, fieldName, stats) {
  return BulkImportStats.create({
    bulkImportId,
    fieldName,
    totalValues: stats.total || 0,
    validValues: stats.valid || 0,
    invalidValues: stats.invalid || 0,
    emptyValues: stats.empty || 0,
    uniqueValues: stats.unique || 0,
    duplicateValues: stats.duplicate || 0,
    commonErrors: stats.commonErrors || [],
    valuePatterns: stats.valuePatterns || {},
    processingTimeMs: stats.processingTime || 0
  });
};

BulkImportStats.bulkCreateStats = function(statsArray) {
  return BulkImportStats.bulkCreate(statsArray, {
    ignoreDuplicates: true,
    returning: true
  });
};

// Define associations
BulkImportStats.associate = (models) => {
  BulkImportStats.belongsTo(models.BulkImport, {
    foreignKey: 'bulkImportId',
    as: 'bulkImport',
  });
};

module.exports = BulkImportStats;