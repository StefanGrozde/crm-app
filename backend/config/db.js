const { Sequelize } = require('sequelize');

// Initialize Sequelize with individual environment variables
const sequelize = new Sequelize(
  process.env.DB_DATABASE, // Database name
  process.env.DB_USER,     // User
  process.env.DB_PASSWORD, // Password
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // This is often required for AWS RDS
      }
    },
    logging: false, // Set to console.log to see the generated SQL queries
    define: {
      underscored: true, // This enables automatic snake_case to camelCase conversion
      freezeTableName: true // This prevents Sequelize from pluralizing table names
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected Successfully.');
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };