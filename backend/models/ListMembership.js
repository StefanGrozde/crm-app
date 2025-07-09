const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const List = require('./List');
const User = require('./User');

const ListMembership = sequelize.define('ListMembership', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  listId: {
    type: DataTypes.INTEGER,
    field: 'list_id',
    references: {
      model: List,
      key: 'id',
    },
    allowNull: false,
  },
  entityType: {
    type: DataTypes.ENUM('contact', 'lead', 'opportunity'),
    allowNull: false,
    field: 'entity_type'
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'entity_id'
  },
  addedBy: {
    type: DataTypes.INTEGER,
    field: 'added_by',
    references: {
      model: User,
      key: 'id',
    },
    allowNull: false,
  },
  addedAt: {
    type: DataTypes.DATE,
    field: 'added_at',
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'list_memberships',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['list_id', 'entity_type', 'entity_id']
    },
    {
      fields: ['list_id']
    },
    {
      fields: ['entity_type']
    },
    {
      fields: ['entity_id']
    },
    {
      fields: ['entity_type', 'entity_id']
    },
    {
      fields: ['added_by']
    }
  ]
});

module.exports = ListMembership;