// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middleware
const corsOptions = {
    origin: 'https://main.dgv1qqnbmvcnk.amplifyapp.com' // Replace with your actual Amplify URL
  };
app.use(cors()); // Allows requests from your frontend
app.use(express.json()); // Allows parsing of JSON in request bodies

// Create a PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false // Required for connecting to RDS
  }
});

// Test Route to check DB connection
app.get('/api/test-db', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()'); // Simple query to check connection
    res.json({ message: 'Database connection successful!', time: result.rows[0].now });
    client.release();
  } catch (err) {
    console.error('Database connection error', err.stack);
    res.status(500).json({ error: 'Failed to connect to database' });
  }
});

// Add more API routes here (e.g., for customers, products, etc.)
// Example: app.get('/api/customers', ...);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
