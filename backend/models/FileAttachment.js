const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FileAttachment = sequelize.define('FileAttachment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // File information
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'original_name'
  },
  storedName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'stored_name'
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'file_path'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'file_size',
    validate: {
      min: 1
    }
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'mime_type'
  },
  fileExtension: {
    type: DataTypes.STRING(10),
    field: 'file_extension'
  },
  
  // Attachment metadata
  entityType: {
    type: DataTypes.ENUM('sale', 'lead', 'contact', 'opportunity', 'task', 'company', 'user'),
    allowNull: false,
    field: 'entity_type'
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'entity_id'
  },
  description: {
    type: DataTypes.TEXT
  },
  tags: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  
  // Access control
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'uploaded_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_public'
  }
}, {
  tableName: 'file_attachments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['entity_type', 'entity_id']
    },
    {
      fields: ['company_id']
    },
    {
      fields: ['uploaded_by']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['mime_type']
    }
  ]
});

// Helper methods
FileAttachment.prototype.getFileUrl = function() {
  return `/api/files/download/${this.id}`;
};

FileAttachment.prototype.isImage = function() {
  return this.mimeType.startsWith('image/');
};

FileAttachment.prototype.isPdf = function() {
  return this.mimeType === 'application/pdf';
};

FileAttachment.prototype.isDocument = function() {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];
  return documentTypes.includes(this.mimeType);
};

// Set up associations
FileAttachment.associate = function(models) {
  FileAttachment.belongsTo(models.User, { 
    foreignKey: 'uploadedBy', 
    as: 'uploader' 
  });
  FileAttachment.belongsTo(models.Company, { 
    foreignKey: 'companyId' 
  });
};

module.exports = FileAttachment;