const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const msal = require('@azure/msal-node');
const Company = require('../models/Company');
const User = require('../models/User');

// --- Helper function to generate and send token ---
const sendTokenResponse = (user, statusCode, res) => {
    // ... (payload and token generation is the same) ...
  
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });
  
    // --- THIS IS THE CRITICAL CHANGE ---
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // Must be true if sameSite is 'None'
      sameSite: 'None', // Allow the cookie to be set from a different domain
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
  
    res.status(statusCode).json({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
  };
  
  // ... MSAL Configuration ...
  
  // 2. Handle the callback from Microsoft
  router.get('/microsoft/callback', async (req, res) => {
      // ... (logic to get user) ...
  
      try {
          // ... (existing try block) ...
  
          // --- THIS IS THE SECOND CRITICAL CHANGE ---
          res.cookie('token', appToken, {
               httpOnly: true,
               secure: true, // Must be true if sameSite is 'None'
               sameSite: 'None', // Allow the cookie to be set from a different domain
               maxAge: 24 * 60 * 60 * 1000,
          });
          
          res.redirect(`${FRONTEND_URI}/login/success`);
  
      } catch (error) {
        console.error(error);
        res.status(500).send("An unexpected error occurred during Microsoft sign-in.");
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
        if (user && (await user.matchPassword(password))) {
            sendTokenResponse(user, 200, res);
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;