const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Company = require('./Company');
const User = require('./User');
const crypto = require('crypto');

const UserInvitation = sequelize.define('UserInvitation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Sales Representative',
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
  invitedBy: {
    type: DataTypes.INTEGER,
    field: 'invited_by',
    references: {
      model: User,
      key: 'id',
    },
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_used'
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'used_at'
  }
}, {
  tableName: 'user_invitations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Generate a unique token
UserInvitation.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Check if invitation is expired
UserInvitation.prototype.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Mark invitation as used
UserInvitation.prototype.markAsUsed = function() {
  this.isUsed = true;
  this.usedAt = new Date();
  return this.save();
};

module.exports = UserInvitation; 