const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: true, // We'll enforce this in the route, not the DB
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Microsoft 365 Email Configuration
  ms365ClientId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ms365_client_id',
  },
  ms365ClientSecret: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'ms365_client_secret',
  },
  ms365TenantId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ms365_tenant_id',
  },
  ms365EmailFrom: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ms365_email_from',
    validate: {
      isEmail: true,
    },
  },
  emailEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_enabled',
  },
}, {
    tableName: 'companies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

// Associations will be defined after all models are loaded
// This is handled in the main index.js file

module.exports = Company;