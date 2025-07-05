// backend/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const msal = require('@azure/msal-node');

const router = express.Router();
const saltRounds = 10;

// --- MSAL Configuration ---
const msalConfig = {
    auth: {
        clientId: process.env.MS_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}`,
        clientSecret: process.env.MS_CLIENT_SECRET,
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Info,
        }
    }
};

const pca = new msal.ConfidentialClientApplication(msalConfig);

const REDIRECT_URI = "https://backend.svnikolaturs.mk/api/auth/microsoft/callback";
const FRONTEND_URI = "https://main.dww6vb3yjjh85.amplifyapp.com";

// 1. Redirect to Microsoft's login page
router.get('/microsoft/login', (req, res) => {
    const authCodeUrlParameters = {
        scopes: ["openid", "email", "user.read"],
        redirectUri: REDIRECT_URI,
    };
    pca.getAuthCodeUrl(authCodeUrlParameters)
        .then((response) => res.redirect(response))
        .catch((error) => {
            console.error("Failed to get auth code URL:", error);
            res.status(500).send("Error generating login URL.");
        });
});

// 2. Handle the callback from Microsoft
router.get('/microsoft/callback', async (req, res) => {
    try {
        const tokenRequest = {
            code: req.query.code,
            scopes: ["openid", "email", "user.read"],
            redirectUri: REDIRECT_URI,
        };

        // --- ADDING MORE LOGGING ---
        console.log("Attempting to acquire token with request:", JSON.stringify(tokenRequest, null, 2));

        const response = await pca.acquireTokenByCode(tokenRequest);
        console.log("Successfully acquired token.");

        const { email, name } = response.account;

        let userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        let user = userResult.rows[0];

        if (!user) {
            console.log(`User with email ${email} not found. Creating new user.`);
            const randomPassword = Math.random().toString(36).slice(-8);
            const passwordHash = await bcrypt.hash(randomPassword, saltRounds);
            const newUser = await pool.query(
                "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
                [name, email, passwordHash]
            );
            user = newUser.rows[0];
            console.log("New user created successfully.");
        }

        const appToken = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.redirect(`${FRONTEND_URI}/login/callback?token=${appToken}`);

    } catch (error) {
        // This should now catch and log ANY error from the process.
        console.error("--- A CATCH-ALL ERROR OCCURRED ---");
        console.error("Full Error Object:", error);
        res.status(500).send("An unexpected error occurred during authentication. Please check the backend logs for details.");
    }
});


// --- Existing Username/Password Routes ---
// (The rest of your file remains the same)
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const newUser = await pool.query(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
            [username, email, passwordHash]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Username or email already exists.' });
        }
        console.error('Registration error:', err.stack);
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const userResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        if (!process.env.JWT_SECRET) {
             console.error('FATAL: JWT_SECRET is not defined in environment variables.');
             return res.status(500).json({ error: 'Server configuration error.' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({
            message: 'Login successful!',
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (err) {
        console.error('Login error:', err.stack);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
});

module.exports = router;