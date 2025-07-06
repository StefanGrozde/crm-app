const { Op, fn, col, literal, where } = require('sequelize');
const User = require('../models/User');
const Company = require('../models/Company');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');

class SearchService {
  /**
   * Perform a comprehensive search across all CRM entities
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} options.userId - Current user ID for filtering
   * @param {number} options.companyId - Company ID for filtering
   * @param {Array} options.types - Array of entity types to search ('contacts', 'leads', 'opportunities', 'companies', 'users')
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
      types = ['contacts', 'leads', 'opportunities', 'companies', 'users'],
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
   * Search contacts with full-text search
   */
  static async searchContacts(query, options = {}) {
    console.log('🔍 SearchService: searchContacts called with query:', query);
    console.log('🔍 SearchService: searchContacts options:', options);
    
    const { userId, companyId, limit = 10, offset = 0 } = options;

    const whereClause = {
      [Op.or]: [
        // Full-text search on name fields
        literal(`to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) @@ plainto_tsquery('english', '${query}')`),
        // Email search
        { email: { [Op.iLike]: `%${query}%` } },
        // Phone search
        { phone: { [Op.iLike]: `%${query}%` } },
        // Job title search
        { jobTitle: { [Op.iLike]: `%${query}%` } },
        // Company name search (through association)
        literal(`EXISTS (
          SELECT 1 FROM companies c 
          WHERE c.id = contacts.company_id 
          AND c.name ILIKE '%${query}%'
        )`),
        // Notes search
        { notes: { [Op.iLike]: `%${query}%` } }
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
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name', 'industry']
          },
          {
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'email']
          }
        ],
        order: [
          // Order by relevance (full-text search rank)
          literal(`ts_rank(to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), plainto_tsquery('english', '${query}')) DESC`),
          ['lastName', 'ASC'],
          ['firstName', 'ASC']
        ],
        limit,
        offset
      });

      console.log('🔍 SearchService: Raw contacts from database:', contacts.length);
      console.log('🔍 SearchService: First contact sample:', contacts[0] ? {
        id: contacts[0].id,
        firstName: contacts[0].firstName,
        lastName: contacts[0].lastName,
        email: contacts[0].email
      } : 'No contacts found');

      const mappedContacts = contacts.map(contact => ({
        id: contact.id,
        type: 'contact',
        title: contact.getFullName(),
        subtitle: contact.jobTitle || contact.company?.name || 'No company',
        email: contact.email,
        phone: contact.phone,
        company: contact.company?.name,
        status: contact.status,
        relevance: contact.dataValues.relevance || 0
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
   * Search leads with full-text search
   */
  static async searchLeads(query, options = {}) {
    const { userId, companyId, limit = 10, offset = 0 } = options;

    const whereClause = {
      [Op.or]: [
        // Title search
        { title: { [Op.iLike]: `%${query}%` } },
        // Description search
        { description: { [Op.iLike]: `%${query}%` } },
        // Contact name search (through association)
        literal(`EXISTS (
          SELECT 1 FROM contacts c 
          WHERE c.id = leads.contact_id 
          AND (c.first_name ILIKE '%${query}%' OR c.last_name ILIKE '%${query}%')
        )`),
        // Company name search (through association)
        literal(`EXISTS (
          SELECT 1 FROM companies c 
          WHERE c.id = leads.company_id 
          AND c.name ILIKE '%${query}%'
        )`),
        // Notes search
        { notes: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (companyId) {
      whereClause.companyId = companyId;
    }

    const leads = await Lead.findAll({
      where: whereClause,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'industry']
        },
        {
          model: Contact,
          as: 'contact',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'email']
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit,
      offset
    });

    return leads.map(lead => ({
      id: lead.id,
      type: 'lead',
      title: lead.title,
      subtitle: lead.contact ? `${lead.contact.firstName} ${lead.contact.lastName}` : lead.company?.name || 'No contact',
      status: lead.status,
      priority: lead.priority,
      estimatedValue: lead.estimatedValue,
      currency: lead.currency,
      company: lead.company?.name,
      relevance: lead.dataValues.relevance || 0
    }));
  }

  /**
   * Search opportunities with full-text search
   */
  static async searchOpportunities(query, options = {}) {
    const { userId, companyId, limit = 10, offset = 0 } = options;

    const whereClause = {
      [Op.or]: [
        // Name search
        { name: { [Op.iLike]: `%${query}%` } },
        // Description search
        { description: { [Op.iLike]: `%${query}%` } },
        // Contact name search (through association)
        literal(`EXISTS (
          SELECT 1 FROM contacts c 
          WHERE c.id = opportunities.contact_id 
          AND (c.first_name ILIKE '%${query}%' OR c.last_name ILIKE '%${query}%')
        )`),
        // Company name search (through association)
        literal(`EXISTS (
          SELECT 1 FROM companies c 
          WHERE c.id = opportunities.company_id 
          AND c.name ILIKE '%${query}%'
        )`),
        // Notes search
        { notes: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (companyId) {
      whereClause.companyId = companyId;
    }

    const opportunities = await Opportunity.findAll({
      where: whereClause,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'industry']
        },
        {
          model: Contact,
          as: 'contact',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'email']
        }
      ],
      order: [
        ['amount', 'DESC'],
        ['expectedCloseDate', 'ASC']
      ],
      limit,
      offset
    });

    return opportunities.map(opportunity => ({
      id: opportunity.id,
      type: 'opportunity',
      title: opportunity.name,
      subtitle: opportunity.contact ? `${opportunity.contact.firstName} ${opportunity.contact.lastName}` : opportunity.company?.name || 'No contact',
      stage: opportunity.stage,
      probability: opportunity.probability,
      amount: opportunity.amount,
      currency: opportunity.currency,
      company: opportunity.company?.name,
      relevance: opportunity.dataValues.relevance || 0
    }));
  }

  /**
   * Search companies with full-text search
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

    const companies = await Company.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'role']
        }
      ],
      order: [
        ['name', 'ASC']
      ],
      limit,
      offset
    });

    return companies.map(company => ({
      id: company.id,
      type: 'company',
      title: company.name,
      subtitle: company.industry || 'No industry specified',
      website: company.website,
      phone: company.phone_number,
      userCount: company.Users?.length || 0,
      relevance: company.dataValues.relevance || 0
    }));
  }

  /**
   * Search users with full-text search
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

    const users = await User.findAll({
      where: whereClause,
      include: [
        {
          model: Company,
          attributes: ['id', 'name', 'industry']
        }
      ],
      order: [
        ['email', 'ASC']
      ],
      limit,
      offset
    });

    return users.map(user => ({
      id: user.id,
      type: 'user',
      title: user.email,
      subtitle: user.role,
      company: user.Company?.name || 'No company',
      role: user.role,
      relevance: user.dataValues.relevance || 0
    }));
  }

  /**
   * Get search suggestions based on recent searches and popular terms
   */
  static async getSearchSuggestions(query, options = {}) {
    const { userId, companyId, limit = 5 } = options;
    
    if (!query || query.length < 2) {
      return [];
    }

    const suggestions = [];

    try {
      // Get contact name suggestions
      const contactSuggestions = await Contact.findAll({
        where: {
          [Op.or]: [
            { firstName: { [Op.iLike]: `${query}%` } },
            { lastName: { [Op.iLike]: `${query}%` } }
          ],
          ...(companyId && { companyId })
        },
        attributes: ['firstName', 'lastName'],
        limit: Math.ceil(limit / 2),
        raw: true
      });

      suggestions.push(...contactSuggestions.map(c => `${c.firstName} ${c.lastName}`));

      // Get company name suggestions
      const companySuggestions = await Company.findAll({
        where: {
          name: { [Op.iLike]: `${query}%` },
          ...(companyId && { id: companyId })
        },
        attributes: ['name'],
        limit: Math.ceil(limit / 2),
        raw: true
      });

      suggestions.push(...companySuggestions.map(c => c.name));

      return suggestions.slice(0, limit);
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

    const [contactCount, leadCount, opportunityCount, companyCount] = await Promise.all([
      Contact.count({ where: whereClause }),
      Lead.count({ where: whereClause }),
      Opportunity.count({ where: whereClause }),
      Company.count({ where: companyId ? { id: companyId } : {} })
    ]);

    return {
      totalContacts: contactCount,
      totalLeads: leadCount,
      totalOpportunities: opportunityCount,
      totalCompanies: companyCount,
      searchableEntities: contactCount + leadCount + opportunityCount + companyCount
    };
  }
}

module.exports = SearchService; 