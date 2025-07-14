const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    entityType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'entity_type',
        validate: {
            isIn: [['contact', 'lead', 'opportunity', 'company', 'user', 'task', 'ticket', 'sale', 'session', 'auth', 'system', 'security']]
        }
    },
    entityId: {
        type: DataTypes.INTEGER,
        allowNull: true, // NULL for session/auth events
        field: 'entity_id'
    },
    operation: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
            isIn: [['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS', 'FAILED_LOGIN']]
        }
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
    },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'company_id'
    },
    fieldName: {
        type: DataTypes.STRING(100),
        allowNull: true, // NULL for CREATE/DELETE/SESSION operations
        field: 'field_name'
    },
    oldValue: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'old_value',
        get() {
            const value = this.getDataValue('oldValue');
            if (value && typeof value === 'string') {
                try {
                    return JSON.parse(value);
                } catch (e) {
                    return value;
                }
            }
            return value;
        },
        set(value) {
            if (value !== null && typeof value === 'object') {
                this.setDataValue('oldValue', JSON.stringify(value));
            } else {
                this.setDataValue('oldValue', value);
            }
        }
    },
    newValue: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'new_value',
        get() {
            const value = this.getDataValue('newValue');
            if (value && typeof value === 'string') {
                try {
                    return JSON.parse(value);
                } catch (e) {
                    return value;
                }
            }
            return value;
        },
        set(value) {
            if (value !== null && typeof value === 'object') {
                this.setDataValue('newValue', JSON.stringify(value));
            } else {
                this.setDataValue('newValue', value);
            }
        }
    },
    ipAddress: {
        type: DataTypes.INET,
        allowNull: true,
        field: 'ip_address'
    },
    userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'user_agent'
    },
    sessionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'session_id'
    },
    sessionDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'session_duration'
    },
    accessMethod: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'access_method',
        validate: {
            isIn: [['cookie_auth', 'login_form', 'session_resume', 'password', 'remember_me']]
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        get() {
            const value = this.getDataValue('metadata');
            return value || {};
        }
    },
    isSensitive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_sensitive'
    },
    requiresApproval: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'requires_approval'
    },
    recordHash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: 'record_hash'
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_deleted'
    }
}, {
    tableName: 'audit_logs',
    timestamps: false, // We handle created_at manually
    paranoid: false, // No soft deletes - audit logs are immutable
    hooks: {
        beforeCreate: (auditLog, options) => {
            // Mark sensitive operations
            const sensitiveEntities = ['user', 'company', 'system', 'security'];
            const sensitiveOperations = ['LOGIN', 'LOGOUT', 'FAILED_LOGIN'];
            
            if (sensitiveEntities.includes(auditLog.entityType) || 
                sensitiveOperations.includes(auditLog.operation)) {
                auditLog.isSensitive = true;
            }
            
            // Generate record hash for integrity
            if (!auditLog.recordHash) {
                const crypto = require('crypto');
                const dataString = JSON.stringify({
                    entityType: auditLog.entityType,
                    entityId: auditLog.entityId,
                    operation: auditLog.operation,
                    fieldName: auditLog.fieldName,
                    oldValue: auditLog.oldValue,
                    newValue: auditLog.newValue,
                    userId: auditLog.userId,
                    timestamp: new Date().toISOString()
                });
                auditLog.recordHash = crypto.createHash('sha256').update(dataString).digest('hex');
            }
        },
        beforeUpdate: () => {
            throw new Error('Audit logs are immutable. Updates are not permitted.');
        },
        beforeDestroy: () => {
            throw new Error('Audit logs are immutable. Deletes are not permitted.');
        },
        beforeBulkUpdate: () => {
            throw new Error('Audit logs are immutable. Bulk updates are not permitted.');
        },
        beforeBulkDestroy: () => {
            throw new Error('Audit logs are immutable. Bulk deletes are not permitted.');
        }
    },
    indexes: [
        {
            fields: ['entity_type', 'entity_id']
        },
        {
            fields: ['user_id', 'created_at']
        },
        {
            fields: ['company_id', 'created_at']
        },
        {
            fields: ['is_sensitive', 'created_at']
        },
        {
            fields: ['operation', 'created_at']
        },
        {
            fields: ['entity_type', 'field_name']
        },
        {
            fields: ['session_id', 'created_at']
        }
    ]
});

// Instance methods
AuditLog.prototype.verifyIntegrity = function() {
    const crypto = require('crypto');
    const dataString = JSON.stringify({
        entityType: this.entityType,
        entityId: this.entityId,
        operation: this.operation,
        fieldName: this.fieldName,
        oldValue: this.oldValue,
        newValue: this.newValue,
        userId: this.userId,
        timestamp: this.createdAt.toISOString()
    });
    const expectedHash = crypto.createHash('sha256').update(dataString).digest('hex');
    return this.recordHash === expectedHash;
};

// Class methods for common operations
AuditLog.getEntityHistory = async function(entityType, entityId, options = {}) {
    const { limit = 50, offset = 0, userRole = 'User' } = options;
    
    const whereClause = {
        entityType,
        entityId
    };
    
    // Non-admins cannot see sensitive audit logs
    if (userRole !== 'Administrator') {
        whereClause.isSensitive = false;
    }
    
    return await this.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });
};

AuditLog.getUserActivity = async function(userId, options = {}) {
    const { limit = 50, offset = 0, requestingUserRole = 'User', requestingUserId } = options;
    
    // Only admins can view other users' activity
    if (userId !== requestingUserId && requestingUserRole !== 'Administrator') {
        throw new Error('Access denied. Administrator role required to view other users\' activity.');
    }
    
    const whereClause = { userId };
    
    // Non-admins cannot see sensitive audit logs
    if (requestingUserRole !== 'Administrator') {
        whereClause.isSensitive = false;
    }
    
    return await this.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });
};

AuditLog.getRecentActivity = async function(companyId, options = {}) {
    const { limit = 20, userRole = 'User' } = options;
    
    const whereClause = { companyId };
    
    // Non-admins cannot see sensitive audit logs
    if (userRole !== 'Administrator') {
        whereClause.isSensitive = false;
    }
    
    return await this.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit
    });
};

module.exports = AuditLog;