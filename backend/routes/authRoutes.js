const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const msal = require('@azure/msal-node');
const Company = require('../models/Company');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// --- MSAL Configuration ---
const msalConfig = {
    auth: {
        clientId: process.env.MS_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}`,
        clientSecret: process.env.MS_CLIENT_SECRET,
    },
};
const pca = new msal.ConfidentialClientApplication(msalConfig);
const REDIRECT_URI = process.env.BACKEND_URL + "/api/auth/microsoft/callback";
const FRONTEND_URI = process.env.FRONTEND_URL;


// --- Helper function to generate and send token ---
const sendTokenResponse = (user, statusCode, res) => {
    const payload = {
        userId: user.id,
        companyId: user.companyId,
        role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '1d',
    });

    const cookieOptions = {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
    };

    if (process.env.NODE_ENV === 'production') {
        cookieOptions.secure = true;
        // Set the parent domain for the cookie
        cookieOptions.domain = '.svnikolaturs.mk'; 
        // 'Lax' is now preferred since it's same-site
        cookieOptions.sameSite = 'Lax'; 
    } else {
        cookieOptions.sameSite = 'Lax';
    }

    res.cookie('token', token, cookieOptions);
    
    res.status(statusCode).json({
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
    });
    
};



// =======================================================
//          MICROSOFT SSO AUTHENTICATION ROUTES
// =======================================================

// STEP 1: Redirect to Microsoft's login page to get an auth code.
router.get('/microsoft/login', (req, res) => {
    pca
        .getAuthCodeUrl({
            scopes: ['openid', 'email', 'profile', 'User.Read'],
            redirectUri: REDIRECT_URI,
        })
        .then((response) => {
            res.redirect(response);
        })
        .catch((error) => {
            console.error("Failed to get auth code URL:", error);
            res.status(500).send('Error generating login URL.');
        });
});

// STEP 2: Handle the callback from Microsoft and pass the code to the frontend.
router.get('/microsoft/callback', (req, res) => {
    const code = req.query.code;
    if (code) {
        // Redirect to a dedicated success page on the frontend with the code
        res.redirect(`${FRONTEND_URI}/login/success?mscode=${code}`);
    } else {
        // Handle cases where no code is provided
        res.redirect(`${FRONTEND_URI}/login?error=microsoft-login-failed`);
    }
});

// STEP 3: Complete the login using the code from the frontend.
router.post('/microsoft/complete', async (req, res) => {
    const { mscode } = req.body;

    if (!mscode) {
        return res.status(400).json({ message: 'Microsoft authentication code is missing.' });
    }

    const tokenRequest = {
        code: mscode,
        scopes: ['openid', 'email', 'profile', 'User.Read'],
        redirectUri: REDIRECT_URI,
    };

    try {
        const response = await pca.acquireTokenByCode(tokenRequest);
        const email = response.account.idTokenClaims.email || response.account.username;
        const name = response.account.name;

        if (!email) {
            return res.status(500).send("Could not retrieve user email from Microsoft.");
        }

        let user = await User.findOne({ where: { email } });

        if (!user) {
            const company = await Company.create({ name: `${name}'s Company` });
            
            user = await User.create({
                email,
                password: Math.random().toString(36),
                companyId: company.id,
                role: 'Administrator',
            });
        }
        
        sendTokenResponse(user, 200, res);

    } catch (error) {
        console.error("Error during Microsoft token acquisition:", error);
        res.status(500).json({ message: "Failed to verify Microsoft login. Please try again." });
    }
});



// --- Username/Password Routes ---
router.post('/register', async (req, res) => {
    const { companyName, email, password } = req.body;
    if (!companyName || !email || !password) {
        return res.status(400).json({ message: 'Company name, email, and password are required.' });
    }
    try {
        await User.sequelize.transaction(async (t) => {
            const company = await Company.create({ name: companyName }, { transaction: t });
            await User.create({
                email,
                password,
                companyId: company.id,
                role: 'Administrator',
            }, { transaction: t });
        });
        res.status(201).json({ message: 'Company and Admin user registered successfully' });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
             return res.status(409).json({ message: 'Email already exists.' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email } });

        // Add this check to prevent a crash if the user is not found
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (await user.matchPassword(password)) {
            sendTokenResponse(user, 200, res);
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/me', protect, (req, res) => {
    // The 'protect' middleware has already fetched the user and attached it to req.user
    if (req.user) {
      res.status(200).json(req.user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
});
  
  module.exports = router;