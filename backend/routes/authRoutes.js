const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const msal = require('@azure/msal-node');
const Company = require('../models/Company');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const AuditService = require('../services/AuditService');

// --- MSAL Configuration ---
let pca = null;
if (process.env.MS_CLIENT_ID && process.env.MS_TENANT_ID && process.env.MS_CLIENT_SECRET) {
    const msalConfig = {
        auth: {
            clientId: process.env.MS_CLIENT_ID,
            authority: `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}`,
            clientSecret: process.env.MS_CLIENT_SECRET,
        },
    };
    pca = new msal.ConfidentialClientApplication(msalConfig);
}
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
    if (!pca) {
        return res.status(500).json({ message: 'Microsoft authentication not configured' });
    }
    
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
    if (!pca) {
        return res.status(500).json({ message: 'Microsoft authentication not configured' });
    }
    
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
    const { email, password, rememberMe } = req.body;
    
    const contextInfo = {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || 'Unknown'
    };
    
    try {
        const user = await User.findOne({ where: { email } });

        // Add this check to prevent a crash if the user is not found
        if (!user) {
            // Log failed login attempt
            await AuditService.logFailedLogin(email, null, contextInfo, 'user_not_found');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (await user.matchPassword(password)) {
            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, companyId: user.companyId },
                process.env.JWT_SECRET,
                { expiresIn: rememberMe ? '30d' : '24h' }
            );

            // Set cookie
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
            });

            // Log successful login
            await AuditService.logLogin(user.id, user.companyId, token, {
                ...contextInfo,
                loginMethod: rememberMe ? 'remember_me' : 'password'
            });

            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    companyId: user.companyId
                }
            });
        } else {
            // Log failed login attempt
            await AuditService.logFailedLogin(email, user.companyId, contextInfo, 'invalid_password');
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Logout endpoint - enhanced with audit logging
router.post('/logout', protect, async (req, res) => {
    try {
        const contextInfo = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent') || 'Unknown'
        };

        // Log logout
        const token = req.cookies.authToken || req.cookies.token;
        if (token) {
            await AuditService.logLogout(
                req.user.id,
                req.user.companyId,
                token,
                contextInfo
            );
        }

        // Clear both possible cookies
        res.clearCookie('authToken');
        res.clearCookie('token');
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

// Check auth status - enhanced with session tracking
router.get('/check', protect, async (req, res) => {
    try {
        // This endpoint is called when app loads with existing cookie
        // Log as app access if this is the first check in a while
        const contextInfo = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent') || 'Unknown'
        };

        // Check if this looks like a fresh app open
        const isAppOpen = req.get('Referer') === undefined || 
                         req.get('Referer').includes('login');

        const token = req.cookies.authToken || req.cookies.token;
        if (isAppOpen && token) {
            // Don't await - log asynchronously
            AuditService.logAppAccess(
                req.user.id,
                req.user.companyId,
                token,
                contextInfo
            ).catch(error => {
                console.error('Error logging app access:', error);
            });
        }

        res.json({
            success: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role,
                companyId: req.user.companyId
            }
        });

    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication check failed'
        });
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