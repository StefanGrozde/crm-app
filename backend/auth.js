// backend/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool =require('./db');
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

const REDIRECT_URI = process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/auth/microsoft/callback` : "http://localhost:8080/api/auth/microsoft/callback";
const FRONTEND_URI = process.env.FRONTEND_URL || "http://localhost:3000";


// --- NEW: Microsoft SSO Routes ---

// 1. Redirect to Microsoft's login page
router.get('/microsoft/login', (req, res) => {
    const authCodeUrlParameters = {
        scopes: ["user.read"],
        redirectUri: REDIRECT_URI,
    };

    pca.getAuthCodeUrl(authCodeUrlParameters)
        .then((response) => {
            res.redirect(response);
        })
        .catch((error) => console.log(JSON.stringify(error)));
});

// 2. Handle the callback from Microsoft
router.get('/microsoft/callback', async (req, res) => {
    console.log("Constructed Redirect URI for token request:", REDIRECT_URI);
    const tokenRequest = {
        code: req.query.code,
        scopes: ["user.read"],
        redirectUri: REDIRECT_URI,
    };

    try {
        const response = await pca.acquireTokenByCode(tokenRequest);
        const { email, name } = response.account;

        // Check if user exists in our database
        let userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        let user = userResult.rows[0];

        // If user doesn't exist, create a new one
        if (!user) {
            // Note: We create a random password hash as it's a required field.
            // This account can only be accessed via SSO.
            const randomPassword = Math.random().toString(36).slice(-8);
            const passwordHash = await bcrypt.hash(randomPassword, saltRounds);
            
            const newUser = await pool.query(
                "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
                [name, email, passwordHash]
            );
            user = newUser.rows[0];
        }

        // Generate our app's JWT token
        const appToken = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Redirect user back to the frontend with the token
        res.redirect(`${FRONTEND_URI}/login/callback?token=${appToken}`);

    } catch (error) {
        console.log(error);
        res.status(500).send('Error during authentication');
    }
});


// --- Existing Username/Password Routes ---

router.post('/register', async (req, res) => {
    // ... (no changes here)
});

router.post('/login', async (req, res) => {
    // ... (no changes here)
});

module.exports = router;