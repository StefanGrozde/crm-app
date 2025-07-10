const { Op, fn, col, literal, where } = require('sequelize');
const User = require('../models/User');
const Company = require('../models/Company');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Sale = require('../models/Sale');
const Task = require('../models/Task');

class SearchService {
  /**
   * Perform a comprehensive search across all CRM entities
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} options.userId - Current user ID for filtering
   * @param {number} options.companyId - Company ID for filtering
   * @param {Array} options.types - Array of entity types to search ('contacts', 'leads', 'opportunities', 'companies', 'users', 'sales')
   * @param {number} options.limit - Maximum number of results per type
   * @param {number} options.offset - Offset for pagination
   * @returns {Object} Search results grouped by entity type
   */
  static async searchAll(query, options = {}) {
    console.log('🔍 SearchService: searchAll called with query:', query);
    console.log('🔍 SearchService: options:', options);
    
    const {
      userId,
      companyId,
      types = ['contacts', 'leads', 'opportunities', 'companies', 'users', 'sales', 'tasks'],
      limit = 10,
      offset = 0
    } = options;

    const results = {};
    const searchPromises = [];

    // Search contacts
    if (types.includes('contacts')) {
      console.log('🔍 SearchService: Searching contacts...');
      searchPromises.push(
        this.searchContacts(query, { userId, companyId, limit, offset })
          .then(contacts => { 
            console.log('🔍 SearchService: Contacts results:', contacts);
            results.contacts = contacts; 
          })
      );
    }

    // Search leads
    if (types.includes('leads')) {
      console.log('🔍 SearchService: Searching leads...');
      searchPromises.push(
        this.searchLeads(query, { userId, companyId, limit, offset })
          .then(leads => { 
            console.log('🔍 SearchService: Leads results:', leads);
            results.leads = leads; 
          })
      );
    }

    // Search opportunities
    if (types.includes('opportunities')) {
      console.log('🔍 SearchService: Searching opportunities...');
      searchPromises.push(
        this.searchOpportunities(query, { userId, companyId, limit, offset })
          .then(opportunities => { 
            console.log('🔍 SearchService: Opportunities results:', opportunities);
            results.opportunities = opportunities; 
          })
      );
    }

    // Search companies
    if (types.includes('companies')) {
      console.log('🔍 SearchService: Searching companies...');
      searchPromises.push(
        this.searchCompanies(query, { userId, companyId, limit, offset })
          .then(companies => { 
            console.log('🔍 SearchService: Companies results:', companies);
            results.companies = companies; 
          })
      );
    }

    // Search users
    if (types.includes('users')) {
      console.log('🔍 SearchService: Searching users...');
      searchPromises.push(
        this.searchUsers(query, { userId, companyId, limit, offset })
          .then(users => { 
            console.log('🔍 SearchService: Users results:', users);
            results.users = users; 
          })
      );
    }

    // Search sales
    if (types.includes('sales')) {
      console.log('🔍 SearchService: Searching sales...');
      searchPromises.push(
        this.searchSales(query, { userId, companyId, limit, offset })
          .then(sales => { 
            console.log('🔍 SearchService: Sales results:', sales);
            results.sales = sales; 
          })
      );
    }

    // Search tasks
    if (types.includes('tasks')) {
      console.log('🔍 SearchService: Searching tasks...');
      searchPromises.push(
        this.searchTasks(query, { userId, companyId, limit, offset })
          .then(tasks => { 
            console.log('🔍 SearchService: Tasks results:', tasks);
            results.tasks = tasks; 
          })
      );
    }

    await Promise.all(searchPromises);

    // Calculate total results
    const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
    console.log('🔍 SearchService: Total results:', totalResults);
    console.log('🔍 SearchService: Final results object:', results);

    return {
      query,
      totalResults,
      results,
      pagination: {
        limit,
        offset,
        hasMore: totalResults === limit
      }
    };
  }

  /**
   * Search contacts with simple search
   */
  static async searchContacts(query, options = {}) {
    console.log('🔍 SearchService: searchContacts called with query:', query);
    console.log('🔍 SearchService: searchContacts options:', options);
    
    const { userId, companyId, limit = 10, offset = 0 } = options;

    const whereClause = {
      [Op.or]: [
        // Simple name search
        { firstName: { [Op.iLike]: `%${query}%` } },
        { lastName: { [Op.iLike]: `%${query}%` } },
        // Email search
        { email: { [Op.iLike]: `%${query}%` } },
        // Phone search
        { phone: { [Op.iLike]: `%${query}%` } },
        // Job title search
        { jobTitle: { [Op.iLike]: `%${query}%` } }
      ]
    };

    // Add company filter if specified
    if (companyId) {
      whereClause.companyId = companyId;
    }

    console.log('🔍 SearchService: Contact whereClause:', JSON.stringify(whereClause, null, 2));

    try {
      const contacts = await Contact.findAll({
        where: whereClause,
        order: [
          ['lastName', 'ASC'],
          ['firstName', 'ASC']
        ],
        limit,
        offset,
        raw: true
      });

      console.log('🔍 SearchService: Raw contacts from database:', contacts.length);
      console.log('🔍 SearchService: First contact sample:', contacts[0] || 'No contacts found');

      const mappedContacts = contacts.map(contact => ({
        id: contact.id,
        type: 'contact',
        title: `${contact.firstName} ${contact.lastName}`,
        subtitle: contact.jobTitle || 'No job title',
        email: contact.email,
        phone: contact.phone,
        company: 'Company name not available', // We'll add this back later
        status: contact.status,
        relevance: 0
      }));

      console.log('🔍 SearchService: Mapped contacts:', mappedContacts);
      return mappedContacts;
    } catch (error) {
      console.error('🔍 SearchService: Error in searchContacts:', error);
      console.error('🔍 SearchService: Error stack:', error.stack);
      return [];
    }
  }

  /**
   * Search leads with PostgreSQL full-text search
   */
  static async searchLeads(query, options = {}) {
    console.log('🔍 SearchService: searchLeads called with query:', query);
    console.log('🔍 SearchService: searchLeads options:', options);
    
    const { userId, companyId, limit = 10, offset = 0 } = options;

    try {
      // Use PostgreSQL full-text search with proper ranking
      const leads = await Lead.findAll({
        where: {
          [Op.and]: [
            // Full-text search using the GIN index
            literal(`to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(notes, '')) @@ plainto_tsquery('english', '${query}')`),
            // Company filter
            companyId ? { companyId } : {}
          ]
        },
        order: [
          // Order by relevance first, then by priority and creation date
          [literal(`ts_rank(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(notes, '')), plainto_tsquery('english', '${query}'))`), 'DESC'],
          ['priority', 'DESC'],
          ['created_at', 'DESC']
        ],
        limit,
        offset,
        raw: true
      });

      console.log('🔍 SearchService: Raw leads from database:', leads.length);
      console.log('🔍 SearchService: First lead sample:', leads[0] || 'No leads found');

      // If no results with full-text search, try simple ILIKE search as fallback
      if (leads.length === 0) {
        console.log('🔍 SearchService: No full-text results, trying ILIKE fallback...');
        
        const fallbackLeads = await Lead.findAll({
          where: {
            [Op.and]: [
              {
                [Op.or]: [
                  { title: { [Op.iLike]: `%${query}%` } },
                  { description: { [Op.iLike]: `%${query}%` } },
                  { source: { [Op.iLike]: `%${query}%` } },
                  { notes: { [Op.iLike]: `%${query}%` } }
                ]
              },
              companyId ? { companyId } : {}
            ]
          },
          order: [
            ['priority', 'DESC'],
            ['created_at', 'DESC']
          ],
          limit,
          offset,
          raw: true
        });

        console.log('🔍 SearchService: Fallback leads found:', fallbackLeads.length);
        
        const mappedLeads = fallbackLeads.map(lead => ({
          id: lead.id,
          type: 'lead',
          title: lead.title,
          subtitle: lead.description ? lead.description.substring(0, 50) + '...' : 'No description',
          status: lead.status,
          priority: lead.priority,
          estimatedValue: lead.estimated_value || lead.estimatedValue,
          currency: lead.currency,
          source: lead.source,
          company: 'Company info not available',
          relevance: 0
        }));

        console.log('🔍 SearchService: Mapped fallback leads:', mappedLeads);
        return mappedLeads;
      }

      const mappedLeads = leads.map(lead => ({
        id: lead.id,
        type: 'lead',
        title: lead.title,
        subtitle: lead.description ? lead.description.substring(0, 50) + '...' : 'No description',
        status: lead.status,
        priority: lead.priority,
        estimatedValue: lead.estimated_value || lead.estimatedValue,
        currency: lead.currency,
        source: lead.source,
        company: 'Company info not available',
        relevance: 0
      }));

      console.log('🔍 SearchService: Mapped leads:', mappedLeads);
      return mappedLeads;
    } catch (error) {
      console.error('🔍 SearchService: Error in searchLeads:', error);
      console.error('🔍 SearchService: Error stack:', error.stack);
      return [];
    }
  }

  /**
   * Search opportunities with simple search
   */
  static async searchOpportunities(query, options = {}) {
    const { userId, companyId, limit = 10, offset = 0 } = options;

    const whereClause = {
      [Op.or]: [
        // Name search
        { name: { [Op.iLike]: `%${query}%` } },
        // Description search
        { description: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (companyId) {
      whereClause.companyId = companyId;
    }

    try {
      const opportunities = await Opportunity.findAll({
        where: whereClause,
        order: [
          ['amount', 'DESC'],
          ['expectedCloseDate', 'ASC']
        ],
        limit,
        offset,
        raw: true
      });

      return opportunities.map(opportunity => ({
        id: opportunity.id,
        type: 'opportunity',
        title: opportunity.name,
        subtitle: 'Contact info not available', // We'll add this back later
        stage: opportunity.stage,
        probability: opportunity.probability,
        amount: opportunity.amount,
        currency: opportunity.currency,
        company: 'Company info not available', // We'll add this back later
        relevance: 0
      }));
    } catch (error) {
      console.error('🔍 SearchService: Error in searchOpportunities:', error);
      console.error('🔍 SearchService: Error stack:', error.stack);
      return [];
    }
  }

  /**
   * Search companies with simple search
   */
  static async searchCompanies(query, options = {}) {
    const { userId, companyId, limit = 10, offset = 0 } = options;

    const whereClause = {
      [Op.or]: [
        // Name search
        { name: { [Op.iLike]: `%${query}%` } },
        // Industry search
        { industry: { [Op.iLike]: `%${query}%` } },
        // Website search
        { website: { [Op.iLike]: `%${query}%` } },
        // Phone search
        { phone_number: { [Op.iLike]: `%${query}%` } }
      ]
    };

    // If companyId is specified, only search within that company's data
    if (companyId) {
      whereClause.id = companyId;
    }

    try {
      const companies = await Company.findAll({
        where: whereClause,
        order: [
          ['name', 'ASC']
        ],
        limit,
        offset,
        raw: true
      });

      return companies.map(company => ({
        id: company.id,
        type: 'company',
        title: company.name,
        subtitle: company.industry || 'No industry specified',
        website: company.website,
        phone: company.phone_number,
        userCount: 0, // We'll add this back later
        relevance: 0
      }));
    } catch (error) {
      console.error('🔍 SearchService: Error in searchCompanies:', error);
      console.error('🔍 SearchService: Error stack:', error.stack);
      return [];
    }
  }

  /**
   * Search users with simple search
   */
  static async searchUsers(query, options = {}) {
    const { userId, companyId, limit = 10, offset = 0 } = options;

    const whereClause = {
      [Op.or]: [
        // Email search
        { email: { [Op.iLike]: `%${query}%` } },
        // Role search
        { role: { [Op.iLike]: `%${query}%` } }
      ]
    };

    // Filter by company if specified
    if (companyId) {
      whereClause.companyId = companyId;
    }

    try {
      const users = await User.findAll({
        where: whereClause,
        order: [
          ['email', 'ASC']
        ],
        limit,
        offset,
        raw: true
      });

      return users.map(user => ({
        id: user.id,
        type: 'user',
        title: user.email,
        subtitle: user.role,
        company: 'Company info not available', // We'll add this back later
        role: user.role,
        relevance: 0
      }));
    } catch (error) {
      console.error('🔍 SearchService: Error in searchUsers:', error);
      console.error('🔍 SearchService: Error stack:', error.stack);
      return [];
    }
  }

  /**
   * Search sales with simple search
   */
  static async searchSales(query, options = {}) {
    const { userId, companyId, limit = 10, offset = 0 } = options;

    const whereClause = {
      [Op.or]: [
        // Sale number search
        { saleNumber: { [Op.iLike]: `%${query}%` } },
        // Title search
        { title: { [Op.iLike]: `%${query}%` } },
        // Description search
        { description: { [Op.iLike]: `%${query}%` } },
        // Category search
        { category: { [Op.iLike]: `%${query}%` } },
        // Source search
        { source: { [Op.iLike]: `%${query}%` } },
        // Notes search
        { notes: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (companyId) {
      whereClause.companyId = companyId;
    }

    try {
      const sales = await Sale.findAll({
        where: whereClause,
        order: [
          ['totalAmount', 'DESC'],
          ['saleDate', 'DESC']
        ],
        limit,
        offset,
        raw: true
      });

      return sales.map(sale => ({
        id: sale.id,
        type: 'sale',
        title: sale.title,
        subtitle: sale.saleNumber,
        status: sale.status,
        paymentStatus: sale.paymentStatus,
        amount: sale.totalAmount,
        currency: sale.currency,
        saleDate: sale.saleDate,
        category: sale.category,
        source: sale.source,
        relevance: 0
      }));
    } catch (error) {
      console.error('🔍 SearchService: Error in searchSales:', error);
      console.error('🔍 SearchService: Error stack:', error.stack);
      return [];
    }
  }

  /**
   * Search tasks with simple search
   */
  static async searchTasks(query, options = {}) {
    const { userId, companyId, limit = 10, offset = 0 } = options;

    const whereClause = {
      [Op.or]: [
        // Title search
        { title: { [Op.iLike]: `%${query}%` } },
        // Description search
        { description: { [Op.iLike]: `%${query}%` } },
        // Category search
        { category: { [Op.iLike]: `%${query}%` } },
        // Tags search
        { tags: { [Op.iLike]: `%${query}%` } },
        // Notes search
        { notes: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (companyId) {
      whereClause.companyId = companyId;
    }

    try {
      const tasks = await Task.findAll({
        where: whereClause,
        order: [
          ['priority', 'DESC'],
          ['dueDate', 'ASC'],
          ['created_at', 'DESC']
        ],
        limit,
        offset,
        raw: true
      });

      return tasks.map(task => ({
        id: task.id,
        type: 'task',
        title: task.title,
        subtitle: task.description ? task.description.substring(0, 50) + '...' : 'No description',
        status: task.status,
        priority: task.priority,
        assignmentType: task.assignmentType,
        dueDate: task.dueDate,
        category: task.category,
        estimatedHours: task.estimatedHours,
        tags: task.tags,
        relevance: 0
      }));
    } catch (error) {
      console.error('🔍 SearchService: Error in searchTasks:', error);
      console.error('🔍 SearchService: Error stack:', error.stack);
      return [];
    }
  }

  /**
   * Get search suggestions based on recent searches and popular terms
   */
  static async getSearchSuggestions(query, options = {}) {
    const { userId, companyId, limit = 5 } = options;
    
    if (!query || query.length < 2) {
      return [];
    }

    try {
      console.log('🔍 SearchService: getSearchSuggestions called with query:', query);
      console.log('🔍 SearchService: options:', options);
      
      const suggestions = [];

      // Simple contact suggestions without complex filtering
      console.log('🔍 SearchService: Fetching contact suggestions...');
      const contactSuggestions = await Contact.findAll({
        where: {
          firstName: { [Op.iLike]: `${query}%` },
          companyId: companyId
        },
        attributes: ['firstName', 'lastName'],
        limit: Math.ceil(limit / 2),
        raw: true
      });
      console.log('🔍 SearchService: Contact suggestions found:', contactSuggestions.length);

      suggestions.push(...contactSuggestions.map(c => `${c.firstName} ${c.lastName}`));

      // Simple company suggestions
      console.log('🔍 SearchService: Fetching company suggestions...');
      const companySuggestions = await Company.findAll({
        where: {
          name: { [Op.iLike]: `${query}%` },
          id: companyId
        },
        attributes: ['name'],
        limit: Math.ceil(limit / 3),
        raw: true
      });
      console.log('🔍 SearchService: Company suggestions found:', companySuggestions.length);

      suggestions.push(...companySuggestions.map(c => c.name));

      // Simple lead suggestions
      console.log('🔍 SearchService: Fetching lead suggestions...');
      const leadSuggestions = await Lead.findAll({
        where: {
          title: { [Op.iLike]: `${query}%` },
          companyId: companyId
        },
        attributes: ['title'],
        limit: Math.ceil(limit / 4),
        raw: true
      });
      console.log('🔍 SearchService: Lead suggestions found:', leadSuggestions.length);

      suggestions.push(...leadSuggestions.map(l => l.title));

      // Simple sales suggestions
      console.log('🔍 SearchService: Fetching sales suggestions...');
      const salesSuggestions = await Sale.findAll({
        where: {
          title: { [Op.iLike]: `${query}%` },
          companyId: companyId
        },
        attributes: ['title'],
        limit: Math.ceil(limit / 4),
        raw: true
      });
      console.log('🔍 SearchService: Sales suggestions found:', salesSuggestions.length);

      suggestions.push(...salesSuggestions.map(s => s.title));

      // Simple task suggestions
      console.log('🔍 SearchService: Fetching task suggestions...');
      const taskSuggestions = await Task.findAll({
        where: {
          title: { [Op.iLike]: `${query}%` },
          companyId: companyId
        },
        attributes: ['title'],
        limit: Math.ceil(limit / 5),
        raw: true
      });
      console.log('🔍 SearchService: Task suggestions found:', taskSuggestions.length);

      suggestions.push(...taskSuggestions.map(t => t.title));

      const result = suggestions.slice(0, limit);
      console.log('🔍 SearchService: Final suggestions:', result);
      return result;
    } catch (error) {
      console.error('🔍 SearchService: Error in getSearchSuggestions:', error);
      console.error('🔍 SearchService: Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Get search analytics and insights
   */
  static async getSearchAnalytics(options = {}) {
    const { userId, companyId, days = 30 } = options;

    const whereClause = {};
    if (companyId) {
      whereClause.companyId = companyId;
    }

    const [contactCount, leadCount, opportunityCount, companyCount, saleCount, taskCount] = await Promise.all([
      Contact.count({ where: whereClause }),
      Lead.count({ where: whereClause }),
      Opportunity.count({ where: whereClause }),
      Company.count({ where: companyId ? { id: companyId } : {} }),
      Sale.count({ where: whereClause }),
      Task.count({ where: whereClause })
    ]);

    return {
      totalContacts: contactCount,
      totalLeads: leadCount,
      totalOpportunities: opportunityCount,
      totalCompanies: companyCount,
      totalSales: saleCount,
      totalTasks: taskCount,
      searchableEntities: contactCount + leadCount + opportunityCount + companyCount + saleCount + taskCount
    };
  }
}

module.exports = SearchService; 