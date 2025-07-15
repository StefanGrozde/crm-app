const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { addAuditHooks } = require('../utils/auditHooks');

const TaskAssignment = sequelize.define('TaskAssignment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'task_id',
    references: {
      model: 'tasks',
      key: 'id',
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'in_progress', 'completed', 'declined'),
    allowNull: false,
    defaultValue: 'pending',
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'accepted_at',
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at',
  },
  hoursLogged: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'hours_logged',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'task_assignments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['task_id'],
    },
    {
      fields: ['user_id'],
    },
    {
      fields: ['status'],
    },
    {
      unique: true,
      fields: ['task_id', 'user_id'],
    },
  ],
});

// Add audit hooks for automatic change tracking
addAuditHooks(TaskAssignment, 'task_assignment', {
  sensitiveFields: ['status', 'userId'], // Track assignment changes
  customMetadata: (instance, operation, context) => ({
    taskId: instance?.taskId,
    userId: instance?.userId,
    status: instance?.status,
    hoursLogged: instance?.hoursLogged,
    hasNotes: !!instance?.notes
  })
});

module.exports = TaskAssignment;