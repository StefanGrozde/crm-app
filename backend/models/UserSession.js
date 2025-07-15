const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UserSession = sequelize.define('UserSession', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
    sessionToken: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'session_token'
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
    loginAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'login_at'
    },
    lastActivity: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'last_activity'
    },
    logoutAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'logout_at'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    loginMethod: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'login_method',
        validate: {
            isIn: [['password', 'remember_me', 'session_resume', 'microsoft_sso', 'microsoft_sso_invitation']]
        }
    },
    deviceInfo: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        field: 'device_info',
        get() {
            const value = this.getDataValue('deviceInfo');
            return value || {};
        }
    },
    locationInfo: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        field: 'location_info',
        get() {
            const value = this.getDataValue('locationInfo');
            return value || {};
        }
    }
}, {
    tableName: 'user_sessions',
    timestamps: false, // We handle timestamps manually
    hooks: {
        beforeCreate: (session, options) => {
            // Update last activity on creation
            session.lastActivity = new Date();
        }
    },
    indexes: [
        {
            fields: ['user_id', 'is_active']
        },
        {
            fields: ['session_token'],
            unique: true
        },
        {
            fields: ['last_activity']
        },
        {
            fields: ['company_id', 'is_active']
        },
        {
            fields: ['ip_address', 'created_at']
        }
    ]
});

// Instance methods
UserSession.prototype.updateActivity = function() {
    this.lastActivity = new Date();
    return this.save();
};

UserSession.prototype.logout = function() {
    this.logoutAt = new Date();
    this.isActive = false;
    this.lastActivity = new Date();
    return this.save();
};

UserSession.prototype.getDuration = function() {
    const endTime = this.logoutAt || new Date();
    return Math.floor((endTime - this.loginAt) / 1000); // Duration in seconds
};

UserSession.prototype.isExpired = function(maxInactiveMinutes = 60) {
    if (!this.isActive) return true;
    
    const now = new Date();
    const maxInactiveMs = maxInactiveMinutes * 60 * 1000;
    return (now - this.lastActivity) > maxInactiveMs;
};

// Class methods
UserSession.getActiveSessions = async function(userId, companyId) {
    return await this.findAll({
        where: {
            userId,
            companyId,
            isActive: true
        },
        order: [['lastActivity', 'DESC']]
    });
};

UserSession.getActiveSessionsForCompany = async function(companyId) {
    return await this.findAll({
        where: {
            companyId,
            isActive: true
        },
        include: [
            {
                model: sequelize.models.User,
                as: 'user',
                attributes: ['id', 'username', 'email'],
                required: true
            }
        ],
        order: [['lastActivity', 'DESC']]
    });
};

UserSession.cleanupExpiredSessions = async function(maxInactiveMinutes = 60) {
    const cutoffTime = new Date(Date.now() - (maxInactiveMinutes * 60 * 1000));
    
    return await this.update(
        {
            isActive: false,
            logoutAt: new Date()
        },
        {
            where: {
                isActive: true,
                lastActivity: {
                    [sequelize.Op.lt]: cutoffTime
                }
            }
        }
    );
};

UserSession.getSessionByToken = async function(sessionToken) {
    return await this.findOne({
        where: {
            sessionToken,
            isActive: true
        },
        include: [
            {
                model: sequelize.models.User,
                as: 'user',
                attributes: ['id', 'username', 'email', 'role', 'companyId'],
                required: true
            }
        ]
    });
};

UserSession.terminateSession = async function(sessionToken, terminatedBy = null) {
    const session = await this.findOne({
        where: {
            sessionToken,
            isActive: true
        }
    });
    
    if (!session) {
        throw new Error('Session not found or already terminated');
    }
    
    await session.update({
        isActive: false,
        logoutAt: new Date()
    });
    
    // Log the termination in audit logs if AuditService is available
    try {
        const AuditService = require('../services/AuditService');
        await AuditService.logChange({
            entityType: 'session',
            entityId: session.id,
            operation: 'LOGOUT',
            userId: session.userId,
            companyId: session.companyId,
            sessionId: sessionToken,
            metadata: {
                logoutMethod: 'forced_termination',
                terminatedBy: terminatedBy
            }
        });
    } catch (error) {
        console.error('Error logging session termination:', error);
    }
    
    return session;
};

module.exports = UserSession;