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
    timestamps: true,
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

module.exports = { DashboardView, DashboardWidget };