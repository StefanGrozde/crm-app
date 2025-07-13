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
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'firstName', 'lastName', 'email']
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

        // Update fields
        if (title !== undefined) ticket.title = title.trim();
        if (description !== undefined) ticket.description = description?.trim();
        if (status !== undefined) ticket.status = status;
        if (priority !== undefined) ticket.priority = priority;
        if (type !== undefined) ticket.type = type;
        if (contactId !== undefined) ticket.contactId = contactId;
        if (assignedTo !== undefined) ticket.assignedTo = assignedTo;
        if (relatedLeadId !== undefined) ticket.relatedLeadId = relatedLeadId;
        if (relatedOpportunityId !== undefined) ticket.relatedOpportunityId = relatedOpportunityId;
        if (relatedSaleId !== undefined) ticket.relatedSaleId = relatedSaleId;
        if (relatedTaskId !== undefined) ticket.relatedTaskId = relatedTaskId;
        if (estimatedHours !== undefined) ticket.estimatedHours = estimatedHours;
        if (actualHours !== undefined) ticket.actualHours = actualHours;
        if (resolutionNotes !== undefined) ticket.resolutionNotes = resolutionNotes?.trim();
        if (tags !== undefined) ticket.tags = tags;

        await ticket.save();

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
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }
            ]
        });

        res.json(updatedTicket);
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ error: 'Failed to update ticket' });
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
        });

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
            order: [['createdAt', 'ASC']]
        });

        res.json(comments);
    } catch (error) {
        console.error('Error fetching ticket comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
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

module.exports = router;