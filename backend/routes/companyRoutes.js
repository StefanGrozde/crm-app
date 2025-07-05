const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

// @desc    Create a new company
// @route   POST /api/companies
// @access  Private (for users without a company)
router.post('/', protect, async (req, res) => {
    // Destructure all the new fields from the body
    const { name, industry, website, phone_number } = req.body;
    const user = req.user;
  
    if (user.companyId) {
      return res.status(400).json({ message: 'User is already part of a company' });
    }
  
    // Add validation for new required fields
    if (!name || !industry) {
      return res.status(400).json({ message: 'Company name and industry are required' });
    }
  
    try {
      // Add new fields to the create method
      const company = await Company.create({
        name,
        industry,
        website,
        phone_number,
      });
  
      // Update the user who created the company to be its admin
      await user.update({
        companyId: company.id,
        role: 'Administrator',
      });
  
      res.status(201).json(company);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  });
  
  module.exports = router;