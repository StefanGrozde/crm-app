const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define('Notification', {
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
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
    references: {
      model: 'companies',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  type: {
    type: DataTypes.ENUM('assignment', 'status_change', 'comment', 'due_date'),
    allowNull: false,
  },
  entityType: {
    type: DataTypes.ENUM('task', 'ticket'),
    allowNull: false,
    field: 'entity_type',
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'entity_id',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_read',
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
  },
}, {
  tableName: 'notifications',
  timestamps: false, // We handle timestamps manually to match snake_case
  indexes: [
    {
      fields: ['user_id', 'is_read'],
      name: 'idx_notifications_user_unread',
    },
    {
      fields: ['company_id', 'user_id'],
      name: 'idx_notifications_company_user',
    },
    {
      fields: ['created_at'],
      name: 'idx_notifications_created_at',
    },
    {
      fields: ['entity_type', 'entity_id'],
      name: 'idx_notifications_entity',
    },
  ],
});

// Define associations
Notification.associate = (models) => {
  Notification.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
  });
  
  Notification.belongsTo(models.Company, {
    foreignKey: 'companyId',
    as: 'company',
  });
};

module.exports = Notification;