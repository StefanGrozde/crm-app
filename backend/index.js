// backend/index.js

const cors = require('cors');
const express = require('express');
// REMOVE: const { Pool } = require('pg');
const pool = require('./db'); // IMPORT our new db helper
const authRoutes = require('./auth'); // IMPORT our new auth routes

console.log("Application starting...");

// --- Environment Variable Check ---
const requiredEnv = ['DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET']; // ADD JWT_SECRET
const missingEnv = requiredEnv.filter(envVar => !process.env[envVar]);

if (missingEnv.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

const app = express();

// --- Middleware ---
const allowedOrigins = [
    'https://main.dww6vb3yjjh85.amplifyapp.com',
    'http://localhost:3000'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};

app.use(cors(corsOptions));
app.use(express.json());

// --- REMOVE PostgreSQL Connection Pool section ---
// We moved all this logic to `db.js`

// --- Routes ---

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Health check successful' });
});

// Use the auth routes
app.use('/api/auth', authRoutes); // ADD THIS LINE

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
        if (client) {
            client.release();
            console.log("Database client released.");
        }
    }
});


// --- Server Startup ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});