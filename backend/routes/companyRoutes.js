const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const EmailService = require('../services/emailService');
const MailboxDiscoveryService = require('../services/MailboxDiscoveryService');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * GET /api/companies/:id/mailboxes
 * Get available mailboxes for the current user's send-from selection
 */
router.get('/:id/mailboxes', protect, async (req, res) => {
  try {
    const companyId = parseInt(req.params.id, 10);
    
    // Security check - users can only access their own company's mailboxes
    if (req.user.companyId !== companyId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check if company has Microsoft 365 configuration
    if (!company.ms365ClientId || !company.ms365ClientSecret || !company.ms365TenantId) {
      return res.status(400).json({ message: 'Microsoft 365 not configured for this company' });
    }

    // Get user's email for mailbox discovery
    const userEmail = req.user.email;
    if (!userEmail || !userEmail.includes('@')) {
      return res.status(400).json({ message: 'User email not available for mailbox discovery' });
    }

    console.log('[MAILBOX-API] Discovering mailboxes for user:', userEmail);

    // Discover mailboxes the user has access to
    const userMailboxes = await MailboxDiscoveryService.discoverUserMailboxes(company, userEmail);
    
    console.log('[MAILBOX-API] Discovered', userMailboxes.length, 'mailboxes for user');
    
    res.json(userMailboxes);
  } catch (error) {
    console.error('Error fetching user mailboxes:', error);
    res.status(500).json({ 
      message: 'Failed to fetch mailboxes',
      error: error.message 
    });
  }
});

// @desc    Get all companies (for dropdowns)
// @route   GET /api/companies
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        // For now, just return the user's company
        // In a multi-tenant system, this would return all companies the user has access to
        const companies = await Company.findAll({
            where: { id: req.user.companyId },
            attributes: ['id', 'name']
        });
        
        res.json(companies);
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Create a new company
// @route   POST /api/companies
// @access  Private (for users without a company)
router.post('/', protect, async (req, res) => {
    // Destructure all the new fields from the body
    const { 
      name, 
      industry, 
      website, 
      phone_number,
      ms365ClientId,
      ms365ClientSecret,
      ms365TenantId,
      ms365EmailFrom,
      emailEnabled
    } = req.body;
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
        ms365ClientId,
        ms365ClientSecret,
        ms365TenantId,
        ms365EmailFrom,
        emailEnabled: emailEnabled || false,
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

// --- NEW: Route to get a single company's details ---
// @desc    Get company by ID
// @route   GET /api/companies/:id
// @access  Private (must be a member of the company)
router.get('/:id', protect, async (req, res) => {
    try {
        const companyId = parseInt(req.params.id, 10);

        // Security Check: Ensure the logged-in user belongs to the company they are requesting.
        if (req.user.companyId !== companyId) {
            return res.status(403).json({ message: 'Not authorized to access this company' });
        }

        const company = await Company.findByPk(companyId);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        res.json(company);
    } catch (error) {
        console.error('Error fetching company:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- NEW: Route to update a company's details ---
// @desc    Update company details
// @route   PUT /api/companies/:id
// @access  Private (Admins only)
router.put('/:id', protect, authorize('Administrator'), async (req, res) => {
    try {
        const companyId = parseInt(req.params.id, 10);
        const { 
          name, 
          industry, 
          website, 
          phone_number,
          ms365ClientId,
          ms365ClientSecret,
          ms365TenantId,
          ms365EmailFrom,
          emailEnabled
        } = req.body;

        // Debug logging
        console.log('[DEBUG] Updating company with email config:', {
            companyId,
            ms365ClientId: ms365ClientId ? '***SET***' : 'NOT SET',
            ms365ClientSecret: ms365ClientSecret ? '***SET***' : 'NOT SET',
            ms365TenantId: ms365TenantId ? '***SET***' : 'NOT SET',
            ms365EmailFrom: ms365EmailFrom ? '***SET***' : 'NOT SET',
            emailEnabled
        });

        // Security Check: Ensure the admin belongs to the company they are trying to update.
        if (req.user.companyId !== companyId) {
            return res.status(403).json({ message: 'Not authorized to update this company' });
        }

        const company = await Company.findByPk(companyId);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Update the company fields
        company.name = name || company.name;
        company.industry = industry || company.industry;
        company.website = website;
        company.phone_number = phone_number;
        company.ms365ClientId = ms365ClientId;
        company.ms365ClientSecret = ms365ClientSecret;
        company.ms365TenantId = ms365TenantId;
        company.ms365EmailFrom = ms365EmailFrom;
        company.emailEnabled = emailEnabled !== undefined ? emailEnabled : company.emailEnabled;

        await company.save();

        console.log('[DEBUG] Company updated successfully');

        res.json(company);
    } catch (error) {
        console.error('Error updating company:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- NEW: Route to test token acquisition only ---
// @desc    Test Microsoft 365 token acquisition (simpler test)
// @route   POST /api/companies/:id/test-token
// @access  Private (Admins only)
router.post('/:id/test-token', protect, authorize('Administrator'), async (req, res) => {
    try {
        const companyId = parseInt(req.params.id, 10);

        // Security Check: Ensure the admin belongs to the company they are testing.
        if (req.user.companyId !== companyId) {
            return res.status(403).json({ message: 'Not authorized to test this company configuration' });
        }

        const company = await Company.findByPk(companyId);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Debug logging
        console.log('[DEBUG] Testing token acquisition for company:', {
            id: company.id,
            name: company.name,
            ms365ClientId: company.ms365ClientId,
            ms365ClientSecret: company.ms365ClientSecret ? '***SET***' : 'NOT SET',
            ms365TenantId: company.ms365TenantId,
            ms365EmailFrom: company.ms365EmailFrom,
            emailEnabled: company.emailEnabled
        });

        // Test token acquisition only
        const testResult = await EmailService.testTokenAcquisition(company);

        res.json(testResult);
    } catch (error) {
        console.error('Error testing token acquisition:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to test token acquisition' 
        });
    }
});

// --- NEW: Route to test email configuration ---
// @desc    Test Microsoft 365 email configuration
// @route   POST /api/companies/:id/test-email-config
// @access  Private (Admins only)
router.post('/:id/test-email-config', protect, authorize('Administrator'), async (req, res) => {
    try {
        const companyId = parseInt(req.params.id, 10);

        // Security Check: Ensure the admin belongs to the company they are testing.
        if (req.user.companyId !== companyId) {
            return res.status(403).json({ message: 'Not authorized to test this company configuration' });
        }

        const company = await Company.findByPk(companyId);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Debug logging
        console.log('[DEBUG] Company email configuration:', {
            id: company.id,
            name: company.name,
            ms365ClientId: company.ms365ClientId,
            ms365ClientSecret: company.ms365ClientSecret ? '***SET***' : 'NOT SET',
            ms365TenantId: company.ms365TenantId,
            ms365EmailFrom: company.ms365EmailFrom,
            emailEnabled: company.emailEnabled
        });

        // Test the email configuration
        const testResult = await EmailService.testEmailConfiguration(company);

        res.json(testResult);
    } catch (error) {
        console.error('Error testing email configuration:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to test email configuration' 
        });
    }
});

// --- NEW: Route to send test email ---
// @desc    Send test email using company configuration
// @route   POST /api/companies/:id/send-test-email
// @access  Private (Admins only)
router.post('/:id/send-test-email', protect, authorize('Administrator'), async (req, res) => {
    try {
        const companyId = parseInt(req.params.id, 10);
        const { testEmailAddress } = req.body;

        // Security Check: Ensure the admin belongs to the company they are testing.
        if (req.user.companyId !== companyId) {
            return res.status(403).json({ message: 'Not authorized to send test email for this company' });
        }

        if (!testEmailAddress) {
            return res.status(400).json({ message: 'Test email address is required' });
        }

        const company = await Company.findByPk(companyId);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Generate sample email content
        const emailContent = EmailService.generateSampleEmail({
            companyName: company.name
        });

        // Send test email
        const emailResult = await EmailService.sendEmail(company, {
            to: testEmailAddress,
            subject: `Test Email from ${company.name} CRM`,
            htmlContent: emailContent
        });

        res.json(emailResult);
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to send test email' 
        });
    }
});

// --- NEW: Route to send email ---
// @desc    Send email using company configuration
// @route   POST /api/companies/:id/send-email
// @access  Private (company members)
router.post('/:id/send-email', protect, async (req, res) => {
    try {
        const companyId = parseInt(req.params.id, 10);
        const { to, subject, htmlContent, bcc, attachments, sendFrom } = req.body;

        // Security Check: Ensure the user belongs to the company they are sending email for.
        if (req.user.companyId !== companyId) {
            return res.status(403).json({ message: 'Not authorized to send email for this company' });
        }

        if (!to || !subject || !htmlContent) {
            return res.status(400).json({ message: 'Recipient, subject, and content are required' });
        }

        const company = await Company.findByPk(companyId);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        console.log('[SEND-EMAIL] Sending email with sendFrom:', sendFrom || 'default');

        // Send email
        const emailResult = await EmailService.sendEmail(company, {
            to,
            subject,
            htmlContent,
            bcc,
            attachments,
            sendFrom // Pass the sendFrom parameter
        });

        res.json(emailResult);
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to send email' 
        });
    }
});
  
module.exports = router;
