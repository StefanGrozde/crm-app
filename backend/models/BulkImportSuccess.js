const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BulkImportSuccess = sequelize.define('BulkImportSuccess', {
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
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'contact_id',
    references: {
      model: 'contacts',
      key: 'id',
    },
  },
  rowNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'row_number'
  },
  actionTaken: {
    type: DataTypes.ENUM('created', 'updated', 'merged', 'skipped_duplicate', 'restored'),
    allowNull: false,
    field: 'action_taken'
  }
}, {
  tableName: 'bulk_import_successes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      fields: ['bulk_import_id']
    },
    {
      fields: ['contact_id']
    },
    {
      fields: ['bulk_import_id', 'row_number']
    },
    {
      fields: ['action_taken']
    },
    {
      fields: ['created_at']
    },
    {
      unique: true,
      fields: ['bulk_import_id', 'contact_id', 'row_number']
    }
  ]
});

// Instance methods
BulkImportSuccess.prototype.wasContactCreated = function() {
  return this.actionTaken === 'created';
};

BulkImportSuccess.prototype.wasContactUpdated = function() {
  return this.actionTaken === 'updated';
};

BulkImportSuccess.prototype.wasContactMerged = function() {
  return this.actionTaken === 'merged';
};

BulkImportSuccess.prototype.wasSkippedDuplicate = function() {
  return this.actionTaken === 'skipped_duplicate';
};

BulkImportSuccess.prototype.getActionDescription = function() {
  const descriptions = {
    'created': 'New contact created',
    'updated': 'Existing contact updated',
    'merged': 'Contact merged with existing record',
    'skipped_duplicate': 'Duplicate contact skipped',
    'restored': 'Previously deleted contact restored'
  };
  
  return descriptions[this.actionTaken] || 'Unknown action';
};

// Static methods
BulkImportSuccess.findByImportId = function(bulkImportId, options = {}) {
  return BulkImportSuccess.findAll({
    where: {
      bulkImportId,
      ...options.where
    },
    order: [['rowNumber', 'ASC']],
    ...options
  });
};

BulkImportSuccess.getActionStatsByImportId = function(bulkImportId) {
  return BulkImportSuccess.findAll({
    where: { bulkImportId },
    attributes: [
      'actionTaken',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['actionTaken'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
  });
};

BulkImportSuccess.getContactsByImportId = function(bulkImportId, options = {}) {
  return BulkImportSuccess.findAll({
    where: { bulkImportId },
    include: [
      {
        model: require('./Contact'),
        as: 'contact',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        ...options.contactInclude
      }
    ],
    order: [['rowNumber', 'ASC']],
    ...options
  });
};

BulkImportSuccess.bulkCreateSuccesses = function(successes) {
  return BulkImportSuccess.bulkCreate(successes, {
    ignoreDuplicates: true,
    returning: true
  });
};

BulkImportSuccess.getImportSummary = function(bulkImportId) {
  return BulkImportSuccess.findOne({
    where: { bulkImportId },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalSuccesses'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN action_taken = 'created' THEN 1 END")), 'created'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN action_taken = 'updated' THEN 1 END")), 'updated'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN action_taken = 'merged' THEN 1 END")), 'merged'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN action_taken = 'skipped_duplicate' THEN 1 END")), 'skipped'],
      [sequelize.fn('MIN', sequelize.col('created_at')), 'firstSuccess'],
      [sequelize.fn('MAX', sequelize.col('created_at')), 'lastSuccess']
    ]
  });
};

// Define associations
BulkImportSuccess.associate = (models) => {
  BulkImportSuccess.belongsTo(models.BulkImport, {
    foreignKey: 'bulkImportId',
    as: 'bulkImport',
  });
  
  BulkImportSuccess.belongsTo(models.Contact, {
    foreignKey: 'contactId',
    as: 'contact',
  });
};

module.exports = BulkImportSuccess;