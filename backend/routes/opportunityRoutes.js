const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Opportunity = require('../models/Opportunity');
const Company = require('../models/Company');
const User = require('../models/User');
const Contact = require('../models/Contact');
const ListMembership = require('../models/ListMembership');
const { Op } = require('sequelize');

// GET /api/opportunities - Get all opportunities with pagination and filtering
router.get('/', protect, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            stage,
            probability,
            assignedTo,
            type,
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
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
                { type: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Filter by stage
        if (stage) {
            whereClause.stage = stage;
        }

        // Filter by probability range
        if (probability) {
            const [min, max] = probability.split('-').map(Number);
            if (min !== undefined && max !== undefined) {
                whereClause.probability = { [Op.between]: [min, max] };
            } else if (min !== undefined) {
                whereClause.probability = { [Op.gte]: min };
            }
        }

        // Filter by company - only show opportunities from user's company
        whereClause.companyId = req.user.companyId;

        // Filter by assigned user
        if (assignedTo) {
            whereClause.assignedTo = assignedTo;
        }

        // Filter by type
        if (type) {
            whereClause.type = { [Op.iLike]: `%${type}%` };
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
            // Get opportunity IDs from the list
            const listMemberships = await ListMembership.findAll({
                where: {
                    listId: listId,
                    entityType: 'opportunity'
                },
                attributes: ['entityId']
            });
            
            const opportunityIds = listMemberships.map(m => m.entityId);
            
            if (opportunityIds.length > 0) {
                whereClause.id = { [Op.in]: opportunityIds };
            } else {
                // If list is empty, return no opportunities
                return res.json({
                    opportunities: [],
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: parseInt(limit)
                    }
                });
            }
        }

        const { count, rows: opportunities } = await Opportunity.findAndCountAll(queryOptions);

        res.json({
            opportunities,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching opportunities:', error);
        res.status(500).json({ message: 'Failed to fetch opportunities' });
    }
});

// GET /api/opportunities/:id - Get a specific opportunity
router.get('/:id', protect, async (req, res) => {
    try {
        const opportunity = await Opportunity.findByPk(req.params.id, {
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

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        res.json(opportunity);
    } catch (error) {
        console.error('Error fetching opportunity:', error);
        res.status(500).json({ message: 'Failed to fetch opportunity' });
    }
});

// POST /api/opportunities - Create a new opportunity
router.post('/', protect, async (req, res) => {
    try {
        const {
            name,
            description,
            stage = 'prospecting',
            probability = 10,
            amount,
            currency = 'USD',
            expectedCloseDate,
            actualCloseDate,
            type,
            source,
            notes,
            tags,
            companyId,
            contactId,
            assignedTo
        } = req.body;

        // Validation
        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        // Sanitize data
        const sanitizedData = {
            name,
            description: description || null,
            stage,
            probability: probability || 10,
            amount: amount || null,
            currency,
            expectedCloseDate: expectedCloseDate || null,
            actualCloseDate: actualCloseDate || null,
            type: type || null,
            source: source || null,
            notes: notes || null,
            tags: tags || [],
            companyId: req.user.companyId, // Automatically set to user's company
            contactId: contactId && contactId !== '' ? parseInt(contactId) : null,
            assignedTo: assignedTo && assignedTo !== '' ? parseInt(assignedTo) : null,
            createdBy: req.user.id
        };

        const opportunity = await Opportunity.create(sanitizedData);

        // Fetch the created opportunity with associations
        const createdOpportunity = await Opportunity.findByPk(opportunity.id, {
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

        res.status(201).json(createdOpportunity);
    } catch (error) {
        console.error('Error creating opportunity:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Failed to create opportunity' });
    }
});

// PUT /api/opportunities/:id - Update an opportunity
router.put('/:id', protect, async (req, res) => {
    try {
        const opportunity = await Opportunity.findByPk(req.params.id);
        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        const {
            name,
            description,
            stage,
            probability,
            amount,
            currency,
            expectedCloseDate,
            actualCloseDate,
            type,
            source,
            notes,
            tags,
            companyId,
            contactId,
            assignedTo
        } = req.body;

        // Validation
        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        // Sanitize data
        const sanitizedData = {
            name,
            description: description || null,
            stage,
            probability: probability || 10,
            amount: amount || null,
            currency,
            expectedCloseDate: expectedCloseDate || null,
            actualCloseDate: actualCloseDate || null,
            type: type || null,
            source: source || null,
            notes: notes || null,
            tags: tags || [],
            companyId: opportunity.companyId, // Keep the original company ID
            contactId: contactId && contactId !== '' ? parseInt(contactId) : null,
            assignedTo: assignedTo && assignedTo !== '' ? parseInt(assignedTo) : null
        };

        await opportunity.update(sanitizedData);

        // Fetch the updated opportunity with associations
        const updatedOpportunity = await Opportunity.findByPk(opportunity.id, {
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

        res.json(updatedOpportunity);
    } catch (error) {
        console.error('Error updating opportunity:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Failed to update opportunity' });
    }
});

// DELETE /api/opportunities/:id - Delete an opportunity
router.delete('/:id', protect, async (req, res) => {
    try {
        const opportunity = await Opportunity.findByPk(req.params.id);
        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        await opportunity.destroy();

        res.json({ message: 'Opportunity deleted successfully' });
    } catch (error) {
        console.error('Error deleting opportunity:', error);
        res.status(500).json({ message: 'Failed to delete opportunity' });
    }
});

// GET /api/opportunities/stats/overview - Get opportunity statistics
router.get('/stats/overview', protect, async (req, res) => {
    try {
        const totalOpportunities = await Opportunity.count({ where: { companyId: req.user.companyId } });
        const prospectingOpportunities = await Opportunity.count({ where: { stage: 'prospecting', companyId: req.user.companyId } });
        const qualificationOpportunities = await Opportunity.count({ where: { stage: 'qualification', companyId: req.user.companyId } });
        const closedWonOpportunities = await Opportunity.count({ where: { stage: 'closed_won', companyId: req.user.companyId } });

        // Opportunities by stage
        const opportunitiesByStage = await Opportunity.findAll({
            attributes: [
                'stage',
                [Opportunity.sequelize.fn('COUNT', Opportunity.sequelize.col('id')), 'count']
            ],
            where: {
                companyId: req.user.companyId
            },
            group: ['stage'],
            order: [[Opportunity.sequelize.fn('COUNT', Opportunity.sequelize.col('id')), 'DESC']]
        });

        // Total pipeline value
        const totalPipelineValue = await Opportunity.sum('amount', {
            where: {
                companyId: req.user.companyId,
                stage: { [Op.notIn]: ['closed_won', 'closed_lost'] }
            }
        });

        // Recent opportunities (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentOpportunities = await Opportunity.count({
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo },
                companyId: req.user.companyId
            }
        });

        res.json({
            totalOpportunities,
            prospectingOpportunities,
            qualificationOpportunities,
            closedWonOpportunities,
            opportunitiesByStage,
            totalPipelineValue: totalPipelineValue || 0,
            recentOpportunities
        });
    } catch (error) {
        console.error('Error fetching opportunity stats:', error);
        res.status(500).json({ message: 'Failed to fetch opportunity statistics' });
    }
});

module.exports = router; 