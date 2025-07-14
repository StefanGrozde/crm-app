const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Company = require('./Company');
const User = require('./User');
const { addAuditHooks } = require('../utils/auditHooks');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  saleNumber: {
    type: DataTypes.STRING(100),
    allowNull: true, // Allow null temporarily so hook can generate it
    unique: true,
    field: 'sale_number'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'processing', 'completed', 'cancelled', 'refunded']]
    }
  },
  saleDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'sale_date'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD'
  },
  discountAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'discount_amount'
  },
  taxAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'tax_amount'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'total_amount'
  },
  paymentMethod: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'payment_method'
  },
  paymentStatus: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending',
    field: 'payment_status',
    validate: {
      isIn: [['pending', 'paid', 'partially_paid', 'failed', 'refunded']]
    }
  },
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'payment_date'
  },
  commissionRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'commission_rate'
  },
  commissionAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'commission_amount'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  companyId: {
    type: DataTypes.INTEGER,
    field: 'company_id',
    references: {
      model: Company,
      key: 'id',
    },
    allowNull: true,
  },
  contactId: {
    type: DataTypes.INTEGER,
    field: 'contact_id',
    allowNull: true,
  },
  leadId: {
    type: DataTypes.INTEGER,
    field: 'lead_id',
    allowNull: true,
  },
  opportunityId: {
    type: DataTypes.INTEGER,
    field: 'opportunity_id',
    allowNull: true,
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    field: 'assigned_to',
    references: {
      model: User,
      key: 'id',
    },
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    field: 'created_by',
    references: {
      model: User,
      key: 'id',
    },
    allowNull: false,
  }
}, {
  tableName: 'sales',
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
      fields: ['lead_id']
    },
    {
      fields: ['opportunity_id']
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
      fields: ['payment_status']
    },
    {
      fields: ['sale_date']
    },
    {
      fields: ['sale_number']
    }
  ],
  hooks: {
    beforeCreate: async (sale) => {
      if (!sale.saleNumber) {
        try {
          // Try to use the database function first
          const result = await sequelize.query("SELECT generate_sale_number() as sale_number");
          sale.saleNumber = result[0][0].sale_number;
        } catch (error) {
          // Fallback: generate manually if function doesn't exist
          console.warn('Database function generate_sale_number() not found, using fallback');
          const currentYear = new Date().getFullYear();
          const randomNumber = Math.floor(Math.random() * 999999) + 1;
          sale.saleNumber = `SALE-${currentYear}-${String(randomNumber).padStart(6, '0')}`;
        }
      }
    }
  }
});

// Add audit hooks for automatic change tracking
addAuditHooks(Sale, 'sale', {
  sensitiveFields: ['totalAmount', 'status', 'closedAt'], // Financial and status fields
  customMetadata: (instance, operation, context) => ({
    saleNumber: instance?.saleNumber,
    status: instance?.status,
    totalAmount: instance?.totalAmount,
    currency: instance?.currency,
    itemCount: instance?.items ? instance.items.length : 0,
    isClosed: instance?.status === 'closed',
    hasDiscount: !!instance?.discountAmount
  })
});

module.exports = Sale;