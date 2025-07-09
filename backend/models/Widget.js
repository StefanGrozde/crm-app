const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Widget = sequelize.define('Widget', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  widgetKey: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'widget_key',
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'builtin-react',
    validate: {
      isIn: [['builtin-react', 'buildin', 'custom']],
    },
  },
  version: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: '1.0.0',
  },
  author: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'System',
  },
  entry: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  directory: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  config: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  dependencies: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'sort_order',
  },
}, {
  tableName: 'widgets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Widget; 