const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const SearchService = require('../services/searchService');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Company = require('../models/Company');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Task = require('../models/Task');

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

    // Create sample sales
    const sampleSales = [
      {
        saleNumber: 'SALE-001',
        title: 'Enterprise Software License',
        description: 'Annual software license for enterprise client',
        status: 'completed',
        saleDate: new Date(),
        amount: 50000.00,
        currency: 'USD',
        discountAmount: 0.00,
        taxAmount: 4000.00,
        totalAmount: 54000.00,
        paymentMethod: 'Credit Card',
        paymentStatus: 'paid',
        paymentDate: new Date(),
        commissionRate: 10.00,
        commissionAmount: 5000.00,
        category: 'Software License',
        source: 'Lead Conversion',
        companyId: user.companyId,
        contactId: createdContacts[0].id,
        leadId: createdLeads[0].id,
        opportunityId: createdOpportunities[0].id,
        createdBy: user.id
      },
      {
        saleNumber: 'SALE-002',
        title: 'Website Redesign Project',
        description: 'Complete website redesign and development',
        status: 'processing',
        saleDate: new Date(),
        amount: 25000.00,
        currency: 'USD',
        discountAmount: 1000.00,
        taxAmount: 2000.00,
        totalAmount: 26000.00,
        paymentMethod: 'Bank Transfer',
        paymentStatus: 'partially_paid',
        paymentDate: new Date(),
        commissionRate: 8.00,
        commissionAmount: 2000.00,
        category: 'Services',
        source: 'Referral',
        companyId: user.companyId,
        contactId: createdContacts[1].id,
        leadId: createdLeads[1].id,
        opportunityId: createdOpportunities[1].id,
        createdBy: user.id
      },
      {
        saleNumber: 'SALE-003',
        title: 'Consulting Services',
        description: 'Strategic business consulting project',
        status: 'pending',
        saleDate: new Date(),
        amount: 15000.00,
        currency: 'USD',
        discountAmount: 0.00,
        taxAmount: 1200.00,
        totalAmount: 16200.00,
        paymentMethod: 'Invoice',
        paymentStatus: 'pending',
        paymentDate: null,
        commissionRate: 12.00,
        commissionAmount: 1800.00,
        category: 'Consulting',
        source: 'Cold Call',
        companyId: user.companyId,
        contactId: createdContacts[2].id,
        leadId: createdLeads[2].id,
        opportunityId: createdOpportunities[2].id,
        createdBy: user.id
      }
    ];

    const createdSales = await Sale.bulkCreate(sampleSales);

    res.json({
      message: 'Sample data created successfully',
      created: {
        contacts: createdContacts.length,
        leads: createdLeads.length,
        opportunities: createdOpportunities.length,
        sales: createdSales.length
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
    console.log('🔍 Backend: Search request received');
    console.log('🔍 Backend: Query params:', req.query);
    console.log('🔍 Backend: User:', { id: req.user.id, companyId: req.user.companyId });
    
    const { 
      q: query, 
      types, 
      limit = 10, 
      offset = 0 
    } = req.query;

    if (!query || query.trim().length < 2) {
      console.log('🔍 Backend: Query too short or empty');
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const searchTypes = types ? types.split(',') : ['contacts', 'leads', 'opportunities', 'companies', 'users', 'sales', 'tasks'];
    console.log('🔍 Backend: Search types:', searchTypes);
    
    const results = await SearchService.searchAll(query.trim(), {
      userId: req.user.id,
      companyId: req.user.companyId,
      types: searchTypes,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log('🔍 Backend: Search results:', results);
    res.json(results);
  } catch (error) {
    console.error('🔍 Backend: Search error:', error);
    console.error('🔍 Backend: Error stack:', error.stack);
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
    console.log('🔍 Backend: Lead search request received');
    console.log('🔍 Backend: Lead search query params:', req.query);
    console.log('🔍 Backend: User:', { id: req.user.id, companyId: req.user.companyId });
    
    const { 
      q: query, 
      limit = 10, 
      offset = 0 
    } = req.query;

    if (!query || query.trim().length < 2) {
      console.log('🔍 Backend: Lead search query too short');
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

    console.log('🔍 Backend: Lead search results:', results);
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
    console.error('🔍 Backend: Lead search error:', error);
    console.error('🔍 Backend: Lead search error stack:', error.stack);
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
 * @route   GET /api/search/sales
 * @desc    Search sales specifically
 * @access  Private
 */
router.get('/sales', protect, async (req, res) => {
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

    const results = await SearchService.searchSales(query.trim(), {
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
    console.error('Sales search error:', error);
    res.status(500).json({ 
      message: 'Sales search failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/search/tasks
 * @desc    Search tasks specifically
 * @access  Private
 */
router.get('/tasks', protect, async (req, res) => {
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

    const results = await SearchService.searchTasks(query.trim(), {
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
    console.error('Tasks search error:', error);
    res.status(500).json({ 
      message: 'Tasks search failed. Please try again.',
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
    console.log('🔍 Backend: Suggestions request received');
    console.log('🔍 Backend: Suggestions query params:', req.query);
    
    const { 
      q: query, 
      limit = 5 
    } = req.query;

    if (!query || query.trim().length < 2) {
      console.log('🔍 Backend: Suggestions query too short');
      return res.json([]);
    }

    const suggestions = await SearchService.getSearchSuggestions(query.trim(), {
      userId: req.user.id,
      companyId: req.user.companyId,
      limit: parseInt(limit)
    });

    console.log('🔍 Backend: Suggestions response:', suggestions);
    res.json(suggestions);
  } catch (error) {
    console.error('🔍 Backend: Search suggestions error:', error);
    console.error('🔍 Backend: Suggestions error stack:', error.stack);
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

/**
 * @route   GET /api/search/test-tables
 * @desc    Test if CRM tables exist and are accessible
 * @access  Private
 */
router.get('/test-tables', protect, async (req, res) => {
  try {
    console.log('🔍 Testing table accessibility...');
    
    const results = {};
    
    // Test Contact table
    try {
      const contactCount = await Contact.count();
      results.contacts = { exists: true, count: contactCount };
      console.log('🔍 Contact table accessible, count:', contactCount);
    } catch (error) {
      results.contacts = { exists: false, error: error.message };
      console.error('🔍 Contact table error:', error.message);
    }
    
    // Test Lead table
    try {
      const leadCount = await Lead.count();
      results.leads = { exists: true, count: leadCount };
      console.log('🔍 Lead table accessible, count:', leadCount);
    } catch (error) {
      results.leads = { exists: false, error: error.message };
      console.error('🔍 Lead table error:', error.message);
    }
    
    // Test Opportunity table
    try {
      const opportunityCount = await Opportunity.count();
      results.opportunities = { exists: true, count: opportunityCount };
      console.log('🔍 Opportunity table accessible, count:', opportunityCount);
    } catch (error) {
      results.opportunities = { exists: false, error: error.message };
      console.error('🔍 Opportunity table error:', error.message);
    }
    
    // Test Company table
    try {
      const companyCount = await Company.count();
      results.companies = { exists: true, count: companyCount };
      console.log('🔍 Company table accessible, count:', companyCount);
    } catch (error) {
      results.companies = { exists: false, error: error.message };
      console.error('🔍 Company table error:', error.message);
    }
    
    // Test User table
    try {
      const userCount = await User.count();
      results.users = { exists: true, count: userCount };
      console.log('🔍 User table accessible, count:', userCount);
    } catch (error) {
      results.users = { exists: false, error: error.message };
      console.error('🔍 User table error:', error.message);
    }
    
    // Test Sale table
    try {
      const saleCount = await Sale.count();
      results.sales = { exists: true, count: saleCount };
      console.log('🔍 Sale table accessible, count:', saleCount);
    } catch (error) {
      results.sales = { exists: false, error: error.message };
      console.error('🔍 Sale table error:', error.message);
    }
    
    res.json(results);
  } catch (error) {
    console.error('🔍 Test tables error:', error);
    res.status(500).json({
      message: 'Failed to test tables',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/search/test-leads
 * @desc    Test leads search functionality
 * @access  Private
 */
router.get('/test-leads', protect, async (req, res) => {
  try {
    console.log('🔍 Testing leads search...');
    
    // Test 1: Check if leads table exists and has data
    const leadCount = await Lead.count();
    console.log('🔍 Total leads in database:', leadCount);
    
    // Test 2: Get a sample lead to see the field structure
    const sampleLead = await Lead.findOne({
      where: { companyId: req.user.companyId },
      raw: true
    });
    console.log('🔍 Sample lead structure:', sampleLead);
    
    // Test 3: Try a simple search
    const searchResults = await SearchService.searchLeads('test', {
      userId: req.user.id,
      companyId: req.user.companyId,
      limit: 5
    });
    console.log('🔍 Search results:', searchResults);
    
    res.json({
      leadCount,
      sampleLead,
      searchResults,
      userCompanyId: req.user.companyId
    });
  } catch (error) {
    console.error('🔍 Test leads error:', error);
    res.status(500).json({
      message: 'Test failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 