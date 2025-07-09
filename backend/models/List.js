const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Company = require('./Company');
const User = require('./User');

const List = sequelize.define('List', {
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
  type: {
    type: DataTypes.ENUM('static', 'smart'),
    defaultValue: 'static',
  },
  entityType: {
    type: DataTypes.ENUM('contact', 'lead', 'opportunity'),
    allowNull: false,
    field: 'entity_type'
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#3B82F6',
  },
  icon: {
    type: DataTypes.STRING(50),
    defaultValue: 'list',
  },
  isShared: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_shared'
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_system'
  },
  smartFilters: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'smart_filters'
  },
  companyId: {
    type: DataTypes.INTEGER,
    field: 'company_id',
    references: {
      model: Company,
      key: 'id',
    },
    allowNull: false,
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
  tableName: 'lists',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['company_id']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['entity_type']
    },
    {
      fields: ['type']
    },
    {
      fields: ['is_shared']
    },
    {
      fields: ['is_system']
    }
  ]
});

module.exports = List;