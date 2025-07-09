const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Lead = require('../models/Lead');
const Company = require('../models/Company');
const User = require('../models/User');
const Contact = require('../models/Contact');
const ListMembership = require('../models/ListMembership');
const { Op } = require('sequelize');

// GET /api/leads - Get all leads with pagination and filtering
router.get('/', protect, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            status,
            priority,
            assignedTo,
            source,
            company,
            listId,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        const whereClause = {};

        // Search functionality
        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
                { source: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Filter by status
        if (status) {
            whereClause.status = status;
        }

        // Filter by priority
        if (priority) {
            whereClause.priority = priority;
        }

        // Filter by company - only show leads from user's company
        whereClause.companyId = req.user.companyId;

        // Filter by assigned user
        if (assignedTo) {
            whereClause.assignedTo = assignedTo;
        }

        // Filter by source
        if (source) {
            whereClause.source = { [Op.iLike]: `%${source}%` };
        }

        // Filter by company
        if (company) {
            whereClause.companyId = company;
        }

        // Set up query options
        const queryOptions = {
            where: whereClause,
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'username', 'email', 'role']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email', 'role']
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }
            ],
            order: [[sortBy, sortOrder.toUpperCase()]],
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        // Filter by list if specified
        if (listId) {
            // Get lead IDs from the list
            const listMemberships = await ListMembership.findAll({
                where: {
                    listId: listId,
                    entityType: 'lead'
                },
                attributes: ['entityId']
            });
            
            const leadIds = listMemberships.map(m => m.entityId);
            
            if (leadIds.length > 0) {
                whereClause.id = { [Op.in]: leadIds };
            } else {
                // If list is empty, return no leads
                return res.json({
                    leads: [],
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: parseInt(limit)
                    }
                });
            }
        }

        const { count, rows: leads } = await Lead.findAndCountAll(queryOptions);

        res.json({
            leads,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ message: 'Failed to fetch leads' });
    }
});

// GET /api/leads/conversion-metrics - Get lead conversion metrics
router.get('/conversion-metrics', protect, async (req, res) => {
    try {
        console.log('Conversion metrics endpoint called');
        console.log('User company ID:', req.user.companyId);
        
        const { days = 30 } = req.query;
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        
        console.log('Days ago:', daysAgo);

        // Simple test - just get total leads first
        const totalLeads = await Lead.count({
            where: {
                companyId: req.user.companyId
            }
        });

        console.log('Total leads found:', totalLeads);

        // Return a simple response for testing
        res.json({
            totalLeads,
            convertedLeads: 0,
            conversionRate: 0,
            averageConversionTime: 0,
            leadsByStage: {},
            conversionTrend: []
        });
    } catch (error) {
        console.error('Error in conversion metrics:', error);
        res.status(500).json({ 
            message: 'Failed to fetch conversion metrics',
            error: error.message,
            stack: error.stack
        });
    }
});

// GET /api/leads/:id - Get a specific lead
router.get('/:id', protect, async (req, res) => {
    try {
        const lead = await Lead.findByPk(req.params.id, {
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'username', 'email', 'role']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email', 'role']
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }
            ]
        });

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        res.json(lead);
    } catch (error) {
        console.error('Error fetching lead:', error);
        res.status(500).json({ message: 'Failed to fetch lead' });
    }
});

// POST /api/leads - Create a new lead
router.post('/', protect, async (req, res) => {
    try {
        const {
            title,
            description,
            status = 'new',
            priority = 'medium',
            estimatedValue,
            currency = 'USD',
            source,
            expectedCloseDate,
            actualCloseDate,
            notes,
            tags,
            companyId,
            contactId,
            assignedTo
        } = req.body;

        // Validation
        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        // Sanitize data
        const sanitizedData = {
            title,
            description: description || null,
            status,
            priority,
            estimatedValue: estimatedValue || null,
            currency,
            source: source || null,
            expectedCloseDate: expectedCloseDate || null,
            actualCloseDate: actualCloseDate || null,
            notes: notes || null,
            tags: tags || [],
            companyId: req.user.companyId, // Automatically set to user's company
            contactId: contactId && contactId !== '' ? parseInt(contactId) : null,
            assignedTo: assignedTo && assignedTo !== '' ? parseInt(assignedTo) : null,
            createdBy: req.user.id
        };

        const lead = await Lead.create(sanitizedData);

        // Fetch the created lead with associations
        const createdLead = await Lead.findByPk(lead.id, {
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'username', 'email', 'role']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email', 'role']
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }
            ]
        });

        res.status(201).json(createdLead);
    } catch (error) {
        console.error('Error creating lead:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Failed to create lead' });
    }
});

// PUT /api/leads/:id - Update a lead
router.put('/:id', protect, async (req, res) => {
    try {
        const lead = await Lead.findByPk(req.params.id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const {
            title,
            description,
            status,
            priority,
            estimatedValue,
            currency,
            source,
            expectedCloseDate,
            actualCloseDate,
            notes,
            tags,
            companyId,
            contactId,
            assignedTo
        } = req.body;

        // Validation
        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        // Sanitize data
        const sanitizedData = {
            title,
            description: description || null,
            status,
            priority,
            estimatedValue: estimatedValue || null,
            currency,
            source: source || null,
            expectedCloseDate: expectedCloseDate || null,
            actualCloseDate: actualCloseDate || null,
            notes: notes || null,
            tags: tags || [],
            companyId: lead.companyId, // Keep the original company ID
            contactId: contactId && contactId !== '' ? parseInt(contactId) : null,
            assignedTo: assignedTo && assignedTo !== '' ? parseInt(assignedTo) : null
        };

        await lead.update(sanitizedData);

        // Fetch the updated lead with associations
        const updatedLead = await Lead.findByPk(lead.id, {
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'username', 'email', 'role']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email', 'role']
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }
            ]
        });

        res.json(updatedLead);
    } catch (error) {
        console.error('Error updating lead:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Failed to update lead' });
    }
});

// DELETE /api/leads/:id - Delete a lead
router.delete('/:id', protect, async (req, res) => {
    try {
        const lead = await Lead.findByPk(req.params.id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        await lead.destroy();

        res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({ message: 'Failed to delete lead' });
    }
});

// GET /api/leads/stats/overview - Get lead statistics
router.get('/stats/overview', protect, async (req, res) => {
    try {
        const totalLeads = await Lead.count({ where: { companyId: req.user.companyId } });
        const newLeads = await Lead.count({ where: { status: 'new', companyId: req.user.companyId } });
        const contactedLeads = await Lead.count({ where: { status: 'contacted', companyId: req.user.companyId } });
        const qualifiedLeads = await Lead.count({ where: { status: 'qualified', companyId: req.user.companyId } });

        // Leads by status
        const leadsByStatus = await Lead.findAll({
            attributes: [
                'status',
                [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'count']
            ],
            where: {
                companyId: req.user.companyId
            },
            group: ['status'],
            order: [[Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'DESC']]
        });

        // Recent leads (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentLeads = await Lead.count({
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo },
                companyId: req.user.companyId
            }
        });

        res.json({
            totalLeads,
            newLeads,
            contactedLeads,
            qualifiedLeads,
            leadsByStatus,
            recentLeads
        });
    } catch (error) {
        console.error('Error fetching lead stats:', error);
        res.status(500).json({ message: 'Failed to fetch lead statistics' });
    }
});

module.exports = router; 