const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TicketComment = sequelize.define('TicketComment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ticketId: {
    type: DataTypes.INTEGER,
    field: 'ticket_id',
    allowNull: false,
    references: {
      model: 'tickets',
      key: 'id',
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    field: 'user_id',
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isInternal: {
    type: DataTypes.BOOLEAN,
    field: 'is_internal',
    defaultValue: false,
    allowNull: false,
  },
}, {
  tableName: 'ticket_comments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['ticket_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['is_internal']
    }
  ]
});

// Virtual field to check if comment is public
TicketComment.prototype.isPublic = function() {
  return !this.isInternal;
};

// Virtual field to get comment type
TicketComment.prototype.getType = function() {
  return this.isInternal ? 'internal' : 'public';
};

module.exports = TicketComment;