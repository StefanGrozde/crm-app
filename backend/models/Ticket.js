const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ticketNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'ticket_number'
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
    type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed', 'on_hold'),
    defaultValue: 'open',
    allowNull: false,
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('bug', 'feature_request', 'support', 'question', 'task', 'incident'),
    defaultValue: 'support',
    allowNull: false,
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    allowNull: true,
  },
  companyId: {
    type: DataTypes.INTEGER,
    field: 'company_id',
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id',
    },
  },
  contactId: {
    type: DataTypes.INTEGER,
    field: 'contact_id',
    allowNull: true,
    references: {
      model: 'contacts',
      key: 'id',
    },
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    field: 'assigned_to',
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  createdBy: {
    type: DataTypes.INTEGER,
    field: 'created_by',
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  // Related entities (optional)
  relatedLeadId: {
    type: DataTypes.INTEGER,
    field: 'related_lead_id',
    allowNull: true,
    references: {
      model: 'leads',
      key: 'id',
    },
  },
  relatedOpportunityId: {
    type: DataTypes.INTEGER,
    field: 'related_opportunity_id',
    allowNull: true,
    references: {
      model: 'opportunities',
      key: 'id',
    },
  },
  relatedSaleId: {
    type: DataTypes.INTEGER,
    field: 'related_sale_id',
    allowNull: true,
    references: {
      model: 'sales',
      key: 'id',
    },
  },
  relatedTaskId: {
    type: DataTypes.INTEGER,
    field: 'related_task_id',
    allowNull: true,
    references: {
      model: 'tasks',
      key: 'id',
    },
  },
  // Timestamps
  resolvedAt: {
    type: DataTypes.DATE,
    field: 'resolved_at',
    allowNull: true,
  },
  closedAt: {
    type: DataTypes.DATE,
    field: 'closed_at',
    allowNull: true,
  },
  // Metadata
  estimatedHours: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'estimated_hours',
    allowNull: true,
  },
  actualHours: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'actual_hours',
    allowNull: true,
  },
  resolutionNotes: {
    type: DataTypes.TEXT,
    field: 'resolution_notes',
    allowNull: true,
  },
}, {
  tableName: 'tickets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['company_id']
    },
    {
      fields: ['contact_id']
    },
    {
      fields: ['assigned_to']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['type']
    },
    {
      fields: ['ticket_number']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['related_lead_id']
    },
    {
      fields: ['related_opportunity_id']
    },
    {
      fields: ['related_sale_id']
    },
    {
      fields: ['related_task_id']
    }
  ]
});

// Virtual field for formatted ticket number display
Ticket.prototype.getDisplayNumber = function() {
  return this.ticketNumber;
};

// Virtual field to check if ticket is open
Ticket.prototype.isOpen = function() {
  return ['open', 'in_progress', 'on_hold'].includes(this.status);
};

// Virtual field to check if ticket is resolved
Ticket.prototype.isResolved = function() {
  return ['resolved', 'closed'].includes(this.status);
};

// Virtual field to get status badge color
Ticket.prototype.getStatusColor = function() {
  const colors = {
    open: 'blue',
    in_progress: 'yellow',
    resolved: 'green',
    closed: 'gray',
    on_hold: 'orange'
  };
  return colors[this.status] || 'gray';
};

// Virtual field to get priority badge color
Ticket.prototype.getPriorityColor = function() {
  const colors = {
    low: 'green',
    medium: 'yellow',
    high: 'orange',
    urgent: 'red'
  };
  return colors[this.priority] || 'gray';
};

module.exports = Ticket;