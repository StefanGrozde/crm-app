const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const DashboardView = sequelize.define('DashboardView', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
        allowNull: false,
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'dashboard_views',
    timestamps: true
});

const DashboardWidget = sequelize.define('DashboardWidget', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    widgetKey: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    x: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    y: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    w: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    h: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    viewId: {
        type: DataTypes.INTEGER,
        references: {
            model: DashboardView,
            key: 'id',
        },
        allowNull: false,
    }
}, {
    tableName: 'dashboard_widgets',
    timestamps: false // No need for timestamps on the widgets themselves
});

// Associations
DashboardView.hasMany(DashboardWidget, { as: 'widgets', foreignKey: 'viewId', onDelete: 'CASCADE' });
DashboardWidget.belongsTo(DashboardView, { foreignKey: 'viewId' });

// User association
DashboardView.belongsTo(User, { foreignKey: 'userId' });

// Static methods for DashboardView
DashboardView.setDefaultForUser = async function(viewId, userId) {
    // First, remove default from all user's views
    await this.update(
        { is_default: false },
        { where: { userId: userId } }
    );
    
    // Then set the specified view as default
    await this.update(
        { is_default: true },
        { where: { id: viewId, userId: userId } }
    );
};

DashboardView.findDefaultForUser = async function(userId) {
    return await this.findOne({
        where: { 
            userId: userId,
            is_default: true 
        },
        include: [{ model: DashboardWidget, as: 'widgets' }]
    });
};

module.exports = { DashboardView, DashboardWidget };