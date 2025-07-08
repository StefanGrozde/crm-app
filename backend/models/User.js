const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Company = require('./Company');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'password_hash'
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Sales Representative',
  },
  companyId: {
    type: DataTypes.INTEGER,
    field: 'company_id',
    references: {
      model: Company,
      key: 'id',
    },
    allowNull: true,
  }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

// Associations will be defined in the main index.js file

// Hook to hash password before saving
User.beforeCreate(async (user, options) => {
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

// Hook to hash password before updating if password is provided
User.beforeUpdate(async (user, options) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// Instance method to compare passwords
User.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;