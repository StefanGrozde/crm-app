const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Ticket = require('../models/Ticket');
const TicketComment = require('../models/TicketComment');
const Company = require('../models/Company');
const User = require('../models/User');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Sale = require('../models/Sale');
const Task = require('../models/Task');
const { Op } = require('sequelize');
const NotificationService = require('../services/NotificationService');

// GET /api/tickets - Get all tickets with pagination and filtering
router.get('/', protect, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            status,
            priority,
            type,
            assignedTo,
            contactId,
            relatedLeadId,
            relatedOpportunityId,
            relatedSaleId,
            relatedTaskId,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        const whereClause = { 
            companyId: req.user.companyId,
            archived: false // Only show non-archived tickets by default
        };

        // Search functionality - search across all relevant fields
        if (search) {
            whereClause[Op.or] = [
                { ticketNumber: { [Op.iLike]: `%${search}%` } },
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
                { resolutionNotes: { [Op.iLike]: `%${search}%` } },
                { status: { [Op.iLike]: `%${search}%` } },
                { priority: { [Op.iLike]: `%${search}%` } },
                { type: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Status filter
        if (status) {
            whereClause.status = status;
        }

        // Priority filter
        if (priority) {
            whereClause.priority = priority;
        }

        // Type filter
        if (type) {
            whereClause.type = type;
        }

        // Assigned to filter
        if (assignedTo) {
            whereClause.assignedTo = assignedTo;
        }

        // Contact filter
        if (contactId) {
            whereClause.contactId = contactId;
        }

        // Related entity filters
        if (relatedLeadId) {
            whereClause.relatedLeadId = relatedLeadId;
        }

        if (relatedOpportunityId) {
            whereClause.relatedOpportunityId = relatedOpportunityId;
        }

        if (relatedSaleId) {
            whereClause.relatedSaleId = relatedSaleId;
        }

        if (relatedTaskId) {
            whereClause.relatedTaskId = relatedTaskId;
        }

        const { count, rows: tickets } = await Ticket.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: Lead,
                    as: 'relatedLead',
                    attributes: ['id', 'title'],
                    required: false
                },
                {
                    model: Opportunity,
                    as: 'relatedOpportunity',
                    attributes: ['id', 'name'],
                    required: false
                },
                {
                    model: Sale,
                    as: 'relatedSale',
                    attributes: ['id', 'title'],
                    required: false
                },
                {
                    model: Task,
                    as: 'relatedTask',
                    attributes: ['id', 'title'],
                    required: false
                }
            ],
            order: [[sortBy, sortOrder.toUpperCase()]],
            limit: parseInt(limit),
            offset: offset,
            distinct: true
        });

        const totalPages = Math.ceil(count / limit);

        res.json({
            tickets,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// GET /api/tickets/filter-options - Get filter options for tickets
router.get('/filter-options', protect, async (req, res) => {
    try {
        // Get unique statuses, priorities, and types from the user's company tickets
        const tickets = await Ticket.findAll({
            where: { companyId: req.user.companyId },
            attributes: ['status', 'priority', 'type'],
            group: ['status', 'priority', 'type']
        });

        // Get assigned users
        const assignedUsers = await User.findAll({
            where: { companyId: req.user.companyId },
            attributes: ['id', 'username', 'email']
        });

        // Get contacts
        const contacts = await Contact.findAll({
            where: { companyId: req.user.companyId },
            attributes: ['id', 'firstName', 'lastName', 'email']
        });

        const filterOptions = {
            statuses: ['open', 'in_progress', 'resolved', 'closed', 'on_hold'],
            priorities: ['low', 'medium', 'high', 'urgent'],
            types: ['bug', 'feature_request', 'support', 'question', 'task', 'incident'],
            assignedUsers,
            contacts
        };

        res.json(filterOptions);
    } catch (error) {
        console.error('Error fetching filter options:', error);
        res.status(500).json({ error: 'Failed to fetch filter options' });
    }
});

// GET /api/tickets/queue/my - Get tickets assigned to current user
router.get('/queue/my', protect, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            status,
            priority,
            type,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        const whereClause = { 
            companyId: req.user.companyId,
            assignedTo: req.user.id,
            archived: false
        };

        // Apply additional filters
        if (search) {
            whereClause[Op.or] = [
                { ticketNumber: { [Op.iLike]: `%${search}%` } },
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (status) whereClause.status = status;
        if (priority) whereClause.priority = priority;
        if (type) whereClause.type = type;

        const { count, rows: tickets } = await Ticket.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                }
            ],
            order: [[sortBy, sortOrder.toUpperCase()]],
            limit: parseInt(limit),
            offset: offset,
            distinct: true
        });

        const totalPages = Math.ceil(count / limit);

        res.json({
            tickets,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching my queue:', error);
        res.status(500).json({ error: 'Failed to fetch my queue' });
    }
});

// GET /api/tickets/queue/unassigned - Get unassigned tickets
router.get('/queue/unassigned', protect, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            status,
            priority,
            type,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        const whereClause = { 
            companyId: req.user.companyId,
            assignedTo: null,
            archived: false
        };

        // Apply additional filters
        if (search) {
            whereClause[Op.or] = [
                { ticketNumber: { [Op.iLike]: `%${search}%` } },
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (status) whereClause.status = status;
        if (priority) whereClause.priority = priority;
        if (type) whereClause.type = type;

        const { count, rows: tickets } = await Ticket.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                }
            ],
            order: [[sortBy, sortOrder.toUpperCase()]],
            limit: parseInt(limit),
            offset: offset,
            distinct: true
        });

        const totalPages = Math.ceil(count / limit);

        res.json({
            tickets,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching unassigned queue:', error);
        res.status(500).json({ error: 'Failed to fetch unassigned queue' });
    }
});

// GET /api/tickets/queue/team - Get tickets assigned to team members
router.get('/queue/team', protect, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            status,
            priority,
            type,
            assignedTo,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        
        // Get all users in the same company (team members)
        const teamMembers = await User.findAll({
            where: { companyId: req.user.companyId },
            attributes: ['id']
        });
        
        const teamMemberIds = teamMembers.map(user => user.id);
        
        const whereClause = { 
            companyId: req.user.companyId,
            assignedTo: { [Op.in]: teamMemberIds },
            archived: false
        };

        // Apply additional filters
        if (search) {
            whereClause[Op.or] = [
                { ticketNumber: { [Op.iLike]: `%${search}%` } },
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (status) whereClause.status = status;
        if (priority) whereClause.priority = priority;
        if (type) whereClause.type = type;
        if (assignedTo) whereClause.assignedTo = assignedTo;

        const { count, rows: tickets } = await Ticket.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                }
            ],
            order: [[sortBy, sortOrder.toUpperCase()]],
            limit: parseInt(limit),
            offset: offset,
            distinct: true
        });

        const totalPages = Math.ceil(count / limit);

        res.json({
            tickets,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching team queue:', error);
        res.status(500).json({ error: 'Failed to fetch team queue' });
    }
});

// GET /api/tickets/queue/stats - Get queue statistics
router.get('/queue/stats', protect, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.id;

        // Get all users in the same company for team stats
        const teamMembers = await User.findAll({
            where: { companyId },
            attributes: ['id']
        });
        const teamMemberIds = teamMembers.map(user => user.id);

        // Get queue counts
        const [myCount, unassignedCount, teamCount, totalCount] = await Promise.all([
            Ticket.count({
                where: { companyId, assignedTo: userId, archived: false }
            }),
            Ticket.count({
                where: { companyId, assignedTo: null, archived: false }
            }),
            Ticket.count({
                where: { companyId, assignedTo: { [Op.in]: teamMemberIds }, archived: false }
            }),
            Ticket.count({
                where: { companyId, archived: false }
            })
        ]);

        // Get priority breakdown for my queue
        const myPriorityStats = await Ticket.findAll({
            where: { companyId, assignedTo: userId, archived: false },
            attributes: [
                'priority',
                [Ticket.sequelize.fn('COUNT', Ticket.sequelize.col('id')), 'count']
            ],
            group: ['priority'],
            raw: true
        });

        // Get status breakdown for my queue
        const myStatusStats = await Ticket.findAll({
            where: { companyId, assignedTo: userId, archived: false },
            attributes: [
                'status',
                [Ticket.sequelize.fn('COUNT', Ticket.sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        res.json({
            queues: {
                my: myCount,
                unassigned: unassignedCount,
                team: teamCount,
                total: totalCount
            },
            myQueue: {
                priority: myPriorityStats.reduce((acc, stat) => {
                    acc[stat.priority] = parseInt(stat.count);
                    return acc;
                }, {}),
                status: myStatusStats.reduce((acc, stat) => {
                    acc[stat.status] = parseInt(stat.count);
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('Error fetching queue stats:', error);
        res.status(500).json({ error: 'Failed to fetch queue stats' });
    }
});

// PUT /api/tickets/:id/assign - Assign ticket to user
router.put('/:id/assign', protect, async (req, res) => {
    try {
        const { assignedTo } = req.body;
        
        const ticket = await Ticket.findOne({
            where: {
                id: req.params.id,
                companyId: req.user.companyId,
                archived: false
            }
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Validate assignedTo user belongs to same company
        if (assignedTo) {
            const user = await User.findOne({
                where: { id: assignedTo, companyId: req.user.companyId }
            });
            if (!user) {
                return res.status(400).json({ error: 'Invalid user assignment' });
            }
        }

        const oldAssignedTo = ticket.assignedTo;
        await ticket.update({ assignedTo });

        // Create assignment notification if assigned to someone new
        if (assignedTo && oldAssignedTo !== assignedTo) {
            try {
                await NotificationService.createTicketAssignmentNotification(
                    ticket,
                    assignedTo,
                    req.user
                );
            } catch (notificationError) {
                console.error('Error creating ticket assignment notification:', notificationError);
            }
        }

        // Fetch updated ticket with associations
        const updatedTicket = await Ticket.findByPk(ticket.id, {
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                }
            ]
        });

        res.json(updatedTicket);
    } catch (error) {
        console.error('Error assigning ticket:', error);
        res.status(500).json({ error: 'Failed to assign ticket' });
    }
});

// PUT /api/tickets/bulk/assign - Bulk assign tickets
router.put('/bulk/assign', protect, async (req, res) => {
    try {
        const { ticketIds, assignedTo } = req.body;
        
        if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
            return res.status(400).json({ error: 'Ticket IDs are required' });
        }

        // Validate assignedTo user belongs to same company
        if (assignedTo) {
            const user = await User.findOne({
                where: { id: assignedTo, companyId: req.user.companyId }
            });
            if (!user) {
                return res.status(400).json({ error: 'Invalid user assignment' });
            }
        }

        // Update tickets
        const [updatedCount] = await Ticket.update(
            { assignedTo },
            {
                where: {
                    id: { [Op.in]: ticketIds },
                    companyId: req.user.companyId,
                    archived: false
                }
            }
        );

        res.json({ 
            message: `${updatedCount} tickets assigned successfully`,
            updatedCount 
        });
    } catch (error) {
        console.error('Error bulk assigning tickets:', error);
        res.status(500).json({ error: 'Failed to bulk assign tickets' });
    }
});

// PUT /api/tickets/bulk/status - Bulk update ticket status
router.put('/bulk/status', protect, async (req, res) => {
    try {
        const { ticketIds, status } = req.body;
        
        if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
            return res.status(400).json({ error: 'Ticket IDs are required' });
        }

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        // Validate status
        const validStatuses = ['open', 'in_progress', 'resolved', 'closed', 'on_hold'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Update tickets
        const [updatedCount] = await Ticket.update(
            { status },
            {
                where: {
                    id: { [Op.in]: ticketIds },
                    companyId: req.user.companyId,
                    archived: false
                }
            }
        );

        res.json({ 
            message: `${updatedCount} tickets updated successfully`,
            updatedCount 
        });
    } catch (error) {
        console.error('Error bulk updating ticket status:', error);
        res.status(500).json({ error: 'Failed to bulk update ticket status' });
    }
});

// GET /api/tickets/:id - Get a specific ticket with comments
router.get('/:id', protect, async (req, res) => {
    try {
        const ticket = await Ticket.findOne({
            where: {
                id: req.params.id,
                companyId: req.user.companyId,
                archived: false // Only show non-archived tickets
            },
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
                },
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: Lead,
                    as: 'relatedLead',
                    attributes: ['id', 'title', 'status'],
                    required: false
                },
                {
                    model: Opportunity,
                    as: 'relatedOpportunity',
                    attributes: ['id', 'name', 'stage'],
                    required: false
                },
                {
                    model: Sale,
                    as: 'relatedSale',
                    attributes: ['id', 'title', 'status'],
                    required: false
                },
                {
                    model: Task,
                    as: 'relatedTask',
                    attributes: ['id', 'title', 'status'],
                    required: false
                },
                {
                    model: TicketComment,
                    as: 'comments',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'email']
                        }
                    ],
                    order: [['createdAt', 'ASC']]
                }
            ]
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json(ticket);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});

// POST /api/tickets - Create a new ticket
router.post('/', protect, async (req, res) => {
    try {
        const {
            title,
            description,
            priority = 'medium',
            type = 'support',
            contactId,
            assignedTo,
            relatedLeadId,
            relatedOpportunityId,
            relatedSaleId,
            relatedTaskId,
            estimatedHours,
            tags = []
        } = req.body;

        // Validation
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Title is required' });
        }

        const ticket = await Ticket.create({
            title: title.trim(),
            description: description?.trim(),
            status: 'open',
            priority,
            type,
            tags,
            companyId: req.user.companyId,
            contactId: contactId || null,
            assignedTo: assignedTo || null,
            createdBy: req.user.id,
            relatedLeadId: relatedLeadId || null,
            relatedOpportunityId: relatedOpportunityId || null,
            relatedSaleId: relatedSaleId || null,
            relatedTaskId: relatedTaskId || null,
            estimatedHours: estimatedHours || null
        });

        // Fetch the created ticket with associations
        const createdTicket = await Ticket.findByPk(ticket.id, {
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                }
            ]
        });

        res.status(201).json(createdTicket);
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});

// PUT /api/tickets/:id - Update a ticket
router.put('/:id', protect, async (req, res) => {
    try {
        const ticket = await Ticket.findOne({
            where: {
                id: req.params.id,
                companyId: req.user.companyId,
                archived: false // Only allow updating non-archived tickets
            }
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const {
            title,
            description,
            status,
            priority,
            type,
            contactId,
            assignedTo,
            relatedLeadId,
            relatedOpportunityId,
            relatedSaleId,
            relatedTaskId,
            estimatedHours,
            actualHours,
            resolutionNotes,
            tags
        } = req.body;

        // Track status and assignment changes for notifications
        const oldStatus = ticket.status;
        const oldAssignedTo = ticket.assignedTo;

        // Update fields using update method
        const updateData = {};
        if (title !== undefined) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description?.trim();
        if (status !== undefined) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;
        if (type !== undefined) updateData.type = type;
        if (contactId !== undefined) updateData.contactId = contactId;
        if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
        if (relatedLeadId !== undefined) updateData.relatedLeadId = relatedLeadId;
        if (relatedOpportunityId !== undefined) updateData.relatedOpportunityId = relatedOpportunityId;
        if (relatedSaleId !== undefined) updateData.relatedSaleId = relatedSaleId;
        if (relatedTaskId !== undefined) updateData.relatedTaskId = relatedTaskId;
        if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
        if (actualHours !== undefined) updateData.actualHours = actualHours;
        if (resolutionNotes !== undefined) updateData.resolutionNotes = resolutionNotes?.trim();
        if (tags !== undefined) updateData.tags = tags;

        await ticket.update(updateData, {
            // Pass user context for audit logging
            user: req.user,
            userId: req.user.id,
            companyId: req.user.companyId
        });

        // Create notifications for status and assignment changes
        try {
            // Status change notification
            if (status !== undefined && oldStatus !== status && ticket.assignedTo) {
                await NotificationService.createTicketStatusChangeNotification(
                    ticket,
                    status,
                    req.user
                );
            }

            // Assignment change notification
            if (assignedTo !== undefined && oldAssignedTo !== assignedTo && assignedTo) {
                await NotificationService.createTicketAssignmentNotification(
                    ticket,
                    assignedTo,
                    req.user
                );
            }
        } catch (notificationError) {
            console.error('Error creating ticket notifications:', notificationError);
        }

        // Fetch updated ticket with associations
        const updatedTicket = await Ticket.findByPk(ticket.id, {
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                }
            ]
        });

        res.json(updatedTicket);
    } catch (error) {
        console.error('Error updating ticket:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ 
                error: 'Validation error', 
                details: error.errors.map(e => e.message) 
            });
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ 
                error: 'Invalid reference (contact, user, or related entity not found)' 
            });
        }
        res.status(500).json({ 
            error: 'Failed to update ticket',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/tickets/:id - Archive a ticket (soft delete)
router.delete('/:id', protect, async (req, res) => {
    try {
        const ticket = await Ticket.findOne({
            where: {
                id: req.params.id,
                companyId: req.user.companyId,
                archived: false // Only allow archiving non-archived tickets
            }
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Archive the ticket instead of deleting
        await ticket.update({ archived: true });
        res.json({ message: 'Ticket archived successfully' });
    } catch (error) {
        console.error('Error archiving ticket:', error);
        res.status(500).json({ error: 'Failed to archive ticket' });
    }
});

// POST /api/tickets/:id/unarchive - Unarchive a ticket
router.post('/:id/unarchive', protect, async (req, res) => {
    try {
        const ticket = await Ticket.findOne({
            where: {
                id: req.params.id,
                companyId: req.user.companyId,
                archived: true // Only allow unarchiving archived tickets
            }
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Archived ticket not found' });
        }

        // Unarchive the ticket
        await ticket.update({ archived: false });
        res.json({ message: 'Ticket unarchived successfully' });
    } catch (error) {
        console.error('Error unarchiving ticket:', error);
        res.status(500).json({ error: 'Failed to unarchive ticket' });
    }
});

// POST /api/tickets/:id/comments - Add a comment to a ticket
router.post('/:id/comments', protect, async (req, res) => {
    try {
        const { comment, isInternal = false } = req.body;

        if (!comment || comment.trim() === '') {
            return res.status(400).json({ error: 'Comment is required' });
        }

        // Verify ticket exists and belongs to user's company
        const ticket = await Ticket.findOne({
            where: {
                id: req.params.id,
                companyId: req.user.companyId,
                archived: false // Only allow comments on non-archived tickets
            }
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticketComment = await TicketComment.create({
            ticketId: req.params.id,
            userId: req.user.id,
            comment: comment.trim(),
            isInternal
        }, {
            // Pass user context for audit logging
            user: req.user,
            userId: req.user.id,
            companyId: req.user.companyId
        });

        // Create comment notification
        try {
            await NotificationService.createTicketCommentNotification(
                ticket,
                { content: comment.trim() },
                req.user
            );
        } catch (notificationError) {
            console.error('Error creating ticket comment notification:', notificationError);
        }

        // Fetch the created comment with user information
        const createdComment = await TicketComment.findByPk(ticketComment.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email']
                }
            ]
        });

        res.status(201).json(createdComment);
    } catch (error) {
        console.error('Error adding ticket comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// GET /api/tickets/:id/comments - Get all comments for a ticket
router.get('/:id/comments', protect, async (req, res) => {
    try {
        // Verify ticket exists and belongs to user's company
        const ticket = await Ticket.findOne({
            where: {
                id: req.params.id,
                companyId: req.user.companyId,
                archived: false // Only allow comments on non-archived tickets
            }
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const comments = await TicketComment.findAll({
            where: { ticketId: req.params.id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email']
                }
            ],
            order: [['created_at', 'ASC']]
        });

        res.json(comments);
    } catch (error) {
        console.error('Error fetching ticket comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

module.exports = router;