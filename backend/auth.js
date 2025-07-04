// backend/auth.js

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = 'jsonwebtoken';
const pool = require('./db'); // We will create this helper file next

const router = express.Router();
const saltRounds = 10;

// --- User Registration ---
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    try {
        // Hash the password
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Save the new user to the database
        const newUser = await pool.query(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
            [username, email, passwordHash]
        );

        res.status(201).json(newUser.rows[0]);

    } catch (err) {
        if (err.code === '23505') { // Unique constraint violation
            return res.status(409).json({ error: 'Username or email already exists.' });
        }
        console.error('Registration error:', err.stack);
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
});


// --- User Login ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        // Find user in the database
        const userResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const user = userResult.rows[0];

        // Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Generate a JWT
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET, // Make sure to set this environment variable!
            { expiresIn: '1h' }
        );

        res.json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (err) {
        console.error('Login error:', err.stack);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
});


module.exports = router;