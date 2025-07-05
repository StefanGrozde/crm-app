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
}, {
    tableName: 'companies',
    timestamps: true,
    createdAt: 'created_at', // <--- ADD THIS LINE
    updatedAt: 'updated_at', // <--- ADD THIS LINE
  });

module.exports = Company;