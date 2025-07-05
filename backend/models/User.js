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
    field: 'password_hash' // <--- ADD THIS LINE
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Sales Representative', // Default role
  },
  companyId: {
    type: DataTypes.INTEGER,
    field: 'company_id', // <--- ADD THIS LINE
    references: {
      model: Company,
      key: 'id',
    },
    allowNull: true, // Let's allow this to be null for now
  },
  

}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at', // Add this line
    updatedAt: 'updated_at', // Add this line
  });

// Define Associations
Company.hasMany(User, { foreignKey: 'companyId' });
User.belongsTo(Company, { foreignKey: 'companyId' });

// Hook to hash password before saving
User.beforeCreate(async (user, options) => {
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

// Instance method to compare passwords
User.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


module.exports = User;