const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'medium',
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'due_date',
  },
  completedDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_date',
  },
  estimatedHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'estimated_hours',
  },
  actualHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'actual_hours',
  },
  assignmentType: {
    type: DataTypes.ENUM('individual', 'multiple', 'all_company'),
    allowNull: false,
    defaultValue: 'individual',
    field: 'assignment_type',
  },
  assignedToAll: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'assigned_to_all',
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  // Relations
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
    references: {
      model: 'companies',
      key: 'id',
    },
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'contact_id',
    references: {
      model: 'contacts',
      key: 'id',
    },
  },
  leadId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'lead_id',
    references: {
      model: 'leads',
      key: 'id',
    },
  },
  opportunityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'opportunity_id',
    references: {
      model: 'opportunities',
      key: 'id',
    },
  },
  saleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'sale_id',
    references: {
      model: 'sales',
      key: 'id',
    },
  },
}, {
  tableName: 'tasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['company_id'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['priority'],
    },
    {
      fields: ['due_date'],
    },
    {
      fields: ['created_by'],
    },
    {
      fields: ['assignment_type'],
    },
  ],
});

module.exports = Task;