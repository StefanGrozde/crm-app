const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const List = require('./List');
const User = require('./User');

const ListShare = sequelize.define('ListShare', {
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
  sharedWith: {
    type: DataTypes.INTEGER,
    field: 'shared_with',
    references: {
      model: User,
      key: 'id',
    },
    allowNull: false,
  },
  permission: {
    type: DataTypes.ENUM('view', 'edit', 'admin'),
    defaultValue: 'view',
  },
  sharedBy: {
    type: DataTypes.INTEGER,
    field: 'shared_by',
    references: {
      model: User,
      key: 'id',
    },
    allowNull: false,
  },
  sharedAt: {
    type: DataTypes.DATE,
    field: 'shared_at',
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'list_shares',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['list_id', 'shared_with']
    },
    {
      fields: ['list_id']
    },
    {
      fields: ['shared_with']
    },
    {
      fields: ['shared_by']
    }
  ]
});

module.exports = ListShare;