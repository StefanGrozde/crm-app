const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const SearchService = require('../services/searchService');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');

/**
 * @route   POST /api/search/sample-data
 * @desc    Create sample data for testing search functionality
 * @access  Private (Admin only)
 */
router.post('/sample-data', protect, async (req, res) => {
  try {
    const { user } = req;
    
    // Check if user is admin
    if (user.role !== 'Administrator') {
      return res.status(403).json({ message: 'Only administrators can create sample data' });
    }

    // Create sample contacts
    const sampleContacts = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0101',
        jobTitle: 'Sales Manager',
        department: 'Sales',
        status: 'active',
        companyId: user.companyId,
        createdBy: user.id
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1-555-0102',
        jobTitle: 'Marketing Director',
        department: 'Marketing',
        status: 'active',
        companyId: user.companyId,
        createdBy: user.id
      },
      {
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@example.com',
        phone: '+1-555-0103',
        jobTitle: 'CEO',
        department: 'Executive',
        status: 'prospect',
        companyId: user.companyId,
        createdBy: user.id
      }
    ];

    const createdContacts = await Contact.bulkCreate(sampleContacts);

    // Create sample leads
    const sampleLeads = [
      {
        title: 'New Software License Deal',
        description: 'Potential client interested in enterprise software license',
        status: 'qualified',
        priority: 'high',
        estimatedValue: 50000.00,
        source: 'Website',
        companyId: user.companyId,
        contactId: createdContacts[0].id,
        createdBy: user.id
      },
      {
        title: 'Website Redesign Project',
        description: 'Company looking to redesign their corporate website',
        status: 'contacted',
        priority: 'medium',
        estimatedValue: 25000.00,
        source: 'Referral',
        companyId: user.companyId,
        contactId: createdContacts[1].id,
        createdBy: user.id
      },
      {
        title: 'Consulting Services',
        description: 'Strategic consulting for business transformation',
        status: 'new',
        priority: 'low',
        estimatedValue: 15000.00,
        source: 'Cold Call',
        companyId: user.companyId,
        contactId: createdContacts[2].id,
        createdBy: user.id
      }
    ];

    const createdLeads = await Lead.bulkCreate(sampleLeads);

    // Create sample opportunities
    const sampleOpportunities = [
      {
        name: 'Enterprise Software Implementation',
        description: 'Full implementation of our enterprise software suite',
        stage: 'proposal',
        probability: 75,
        amount: 100000.00,
        type: 'Software License',
        source: 'Lead Conversion',
        companyId: user.companyId,
        contactId: createdContacts[0].id,
        createdBy: user.id
      },
      {
        name: 'Digital Marketing Campaign',
        description: 'Comprehensive digital marketing campaign for Q2',
        stage: 'negotiation',
        probability: 60,
        amount: 35000.00,
        type: 'Services',
        source: 'Referral',
        companyId: user.companyId,
        contactId: createdContacts[1].id,
        createdBy: user.id
      },
      {
        name: 'Business Process Optimization',
        description: 'Consulting project to optimize business processes',
        stage: 'qualification',
        probability: 40,
        amount: 20000.00,
        type: 'Consulting',
        source: 'Website',
        companyId: user.companyId,
        contactId: createdContacts[2].id,
        createdBy: user.id
      }
    ];

    const createdOpportunities = await Opportunity.bulkCreate(sampleOpportunities);

    res.json({
      message: 'Sample data created successfully',
      created: {
        contacts: createdContacts.length,
        leads: createdLeads.length,
        opportunities: createdOpportunities.length
      }
    });

  } catch (error) {
    console.error('Error creating sample data:', error);
    res.status(500).json({ 
      message: 'Failed to create sample data.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/search
 * @desc    Search across all CRM entities
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { 
      q: query, 
      types, 
      limit = 10, 
      offset = 0 
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const searchTypes = types ? types.split(',') : ['contacts', 'leads', 'opportunities', 'companies', 'users'];
    
    const results = await SearchService.searchAll(query.trim(), {
      userId: req.user.id,
      companyId: req.user.companyId,
      types: searchTypes,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      message: 'Search failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/search/contacts
 * @desc    Search contacts specifically
 * @access  Private
 */
router.get('/contacts', protect, async (req, res) => {
  try {
    const { 
      q: query, 
      limit = 10, 
      offset = 0 
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const results = await SearchService.searchContacts(query.trim(), {
      userId: req.user.id,
      companyId: req.user.companyId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      query: query.trim(),
      totalResults: results.length,
      results,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: results.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Contact search error:', error);
    res.status(500).json({ 
      message: 'Contact search failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/search/leads
 * @desc    Search leads specifically
 * @access  Private
 */
router.get('/leads', protect, async (req, res) => {
  try {
    const { 
      q: query, 
      limit = 10, 
      offset = 0 
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const results = await SearchService.searchLeads(query.trim(), {
      userId: req.user.id,
      companyId: req.user.companyId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      query: query.trim(),
      totalResults: results.length,
      results,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: results.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Lead search error:', error);
    res.status(500).json({ 
      message: 'Lead search failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/search/opportunities
 * @desc    Search opportunities specifically
 * @access  Private
 */
router.get('/opportunities', protect, async (req, res) => {
  try {
    const { 
      q: query, 
      limit = 10, 
      offset = 0 
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const results = await SearchService.searchOpportunities(query.trim(), {
      userId: req.user.id,
      companyId: req.user.companyId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      query: query.trim(),
      totalResults: results.length,
      results,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: results.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Opportunity search error:', error);
    res.status(500).json({ 
      message: 'Opportunity search failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/search/companies
 * @desc    Search companies specifically
 * @access  Private
 */
router.get('/companies', protect, async (req, res) => {
  try {
    const { 
      q: query, 
      limit = 10, 
      offset = 0 
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const results = await SearchService.searchCompanies(query.trim(), {
      userId: req.user.id,
      companyId: req.user.companyId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      query: query.trim(),
      totalResults: results.length,
      results,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: results.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Company search error:', error);
    res.status(500).json({ 
      message: 'Company search failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions
 * @access  Private
 */
router.get('/suggestions', protect, async (req, res) => {
  try {
    const { 
      q: query, 
      limit = 5 
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const suggestions = await SearchService.getSearchSuggestions(query.trim(), {
      userId: req.user.id,
      companyId: req.user.companyId,
      limit: parseInt(limit)
    });

    res.json(suggestions);
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ 
      message: 'Failed to get search suggestions.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/search/analytics
 * @desc    Get search analytics
 * @access  Private
 */
router.get('/analytics', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const analytics = await SearchService.getSearchAnalytics({
      userId: req.user.id,
      companyId: req.user.companyId,
      days: parseInt(days)
    });

    res.json(analytics);
  } catch (error) {
    console.error('Search analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to get search analytics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 