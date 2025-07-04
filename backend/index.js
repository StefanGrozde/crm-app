// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

console.log("Application starting...");

// --- Environment Variable Check ---
// Elastic Beanstalk relies on the application starting successfully.
// If required environment variables are missing, it's better to fail fast
// with a clear error message.
const requiredEnv = ['DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD'];
const missingEnv = requiredEnv.filter(envVar => !process.env[envVar]);

if (missingEnv.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missingEnv.join(', ')}`);
    // Exit the process with an error code, which will be visible in Elastic Beanstalk logs.
    process.exit(1);
}

const app = express();

// --- Middleware ---
const corsOptions = {
    // You can keep this specific or open it up for debugging if needed
    origin: 'https://main.dgv1qqnbmvcnk.amplifyapp.com'
};
app.use(cors(corsOptions));
app.use(express.json());

// --- PostgreSQL Connection Pool ---
// This configuration will now use the validated environment variables.

// Conditionally set SSL for production environments like Elastic Beanstalk
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Running in ${isProduction ? 'production' : 'development'} mode.`);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Only enforce SSL in production. This is a common practice.
  // Note: `rejectUnauthorized: false` is a security risk and should ideally be
  // replaced by using the actual RDS CA certificate.
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  // Add a connection timeout to get faster feedback on connection issues
  connectionTimeoutMillis: 10000, // 10 seconds
});


pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

console.log("PostgreSQL pool configured.");

// --- Routes ---

// ** NEW: Root route for Elastic Beanstalk Health Checker **
// EB sends a request to this path to check if the instance is healthy.
// Responding with a 200 OK status tells EB that your app is running.
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Health check successful' });
});


// Test Route to check DB connection
app.get('/api/test-db', async (req, res) => {
  let client;
  try {
    console.log("Attempting to connect to the database...");
    client = await pool.connect();
    console.log("Database client connected.");
    const result = await client.query('SELECT NOW()');
    console.log("Database query successful.");
    res.json({ message: 'Database connection successful!', time: result.rows[0].now });
  } catch (err) {
    console.error('Database connection error:', err.stack);
    res.status(500).json({ error: 'Failed to connect to database' });
  } finally {
    // Ensure the client is always released back to the pool
    if (client) {
        client.release();
        console.log("Database client released.");
    }
  }
});

// Add more API routes here (e.g., for customers, products, etc.)
// Example: app.get('/api/customers', ...);

// --- Server Startup ---
// Use the port provided by Elastic Beanstalk, or 3001 for local development.
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
