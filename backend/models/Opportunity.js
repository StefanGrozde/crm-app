const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Company = require('./Company');
const User = require('./User');
const Contact = require('./Contact');

const Opportunity = sequelize.define('Opportunity', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  stage: {
    type: DataTypes.ENUM('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'),
    defaultValue: 'prospecting',
  },
  probability: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100,
    },
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
  },
  expectedCloseDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expected_close_date'
  },
  actualCloseDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'actual_close_date'
  },
  type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  companyId: {
    type: DataTypes.INTEGER,
    field: 'company_id',
    references: {
      model: Company,
      key: 'id',
    },
    allowNull: true,
  },
  contactId: {
    type: DataTypes.INTEGER,
    field: 'contact_id',
    references: {
      model: Contact,
      key: 'id',
    },
    allowNull: true,
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    field: 'assigned_to',
    references: {
      model: User,
      key: 'id',
    },
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    field: 'created_by',
    references: {
      model: User,
      key: 'id',
    },
    allowNull: false,
  }
}, {
  tableName: 'opportunities',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['stage']
    },
    {
      fields: ['assigned_to']
    },
    {
      fields: ['company_id']
    },
    {
      fields: ['contact_id']
    },
    {
      fields: ['expected_close_date']
    },
    {
      fields: ['amount']
    }
  ]
});

// Associations will be defined in the main index.js file

module.exports = Opportunity; 