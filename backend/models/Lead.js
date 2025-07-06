const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Company = require('./Company');
const User = require('./User');
const Contact = require('./Contact');

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'),
    defaultValue: 'new',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
  },
  estimatedValue: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'estimated_value'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
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
  tableName: 'leads',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['priority']
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
    }
  ]
});

// Associations
Lead.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Lead.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
Lead.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
Lead.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = Lead; 