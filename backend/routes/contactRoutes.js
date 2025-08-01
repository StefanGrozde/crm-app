const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Contact = require('../models/Contact');
const Company = require('../models/Company');
const User = require('../models/User');
const Sale = require('../models/Sale');
const ListMembership = require('../models/ListMembership');
const { Op } = require('sequelize');
const { getAuditContext } = require('../utils/auditHooks');

// GET /api/contacts - Get all contacts with pagination and filtering
router.get('/', protect, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            status,
            assignedTo,
            source,
            department,
            city,
            state,
            country,
            listId,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        const whereClause = {};

        // Search functionality - search across all relevant fields
        if (search) {
            whereClause[Op.or] = [
                { firstName: { [Op.iLike]: `%${search}%` } },
                { lastName: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
                { phone: { [Op.iLike]: `%${search}%` } },
                { mobile: { [Op.iLike]: `%${search}%` } },
                { jobTitle: { [Op.iLike]: `%${search}%` } },
                { department: { [Op.iLike]: `%${search}%` } },
                { address: { [Op.iLike]: `%${search}%` } },
                { city: { [Op.iLike]: `%${search}%` } },
                { state: { [Op.iLike]: `%${search}%` } },
                { zipCode: { [Op.iLike]: `%${search}%` } },
                { country: { [Op.iLike]: `%${search}%` } },
                { notes: { [Op.iLike]: `%${search}%` } },
                { status: { [Op.iLike]: `%${search}%` } },
                { source: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Filter by status
        if (status) {
            whereClause.status = status;
        }

        // Filter by company - only show contacts from user's company
        whereClause.companyId = req.user.companyId;

        // Filter by assigned user
        if (assignedTo) {
            whereClause.assignedTo = assignedTo;
        }

        // Filter by source
        if (source) {
            whereClause.source = { [Op.iLike]: `%${source}%` };
        }

        // Filter by department
        if (department) {
            whereClause.department = { [Op.iLike]: `%${department}%` };
        }

        // Filter by city
        if (city) {
            whereClause.city = { [Op.iLike]: `%${city}%` };
        }

        // Filter by state
        if (state) {
            whereClause.state = { [Op.iLike]: `%${state}%` };
        }

        // Filter by country
        if (country) {
            whereClause.country = { [Op.iLike]: `%${country}%` };
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
            offset: parseInt(offset)
        };

        // Filter by list if specified
        if (listId) {
            // Get contact IDs from the list
            const listMemberships = await ListMembership.findAll({
                where: {
                    listId: listId,
                    entityType: 'contact'
                },
                attributes: ['entityId']
            });
            
            const contactIds = listMemberships.map(m => m.entityId);
            
            if (contactIds.length > 0) {
                whereClause.id = { [Op.in]: contactIds };
            } else {
                // If list is empty, return no contacts
                return res.json({
                    contacts: [],
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: parseInt(limit)
                    }
                });
            }
        }

        const { count, rows: contacts } = await Contact.findAndCountAll(queryOptions);

        res.json({
            contacts,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ message: 'Failed to fetch contacts' });
    }
});

// GET /api/contacts/filter-options - Get available filter options
router.get('/filter-options', protect, async (req, res) => {
    try {
        // Get all unique sources
        const sources = await Contact.findAll({
            attributes: [
                'source',
                [Contact.sequelize.fn('COUNT', Contact.sequelize.col('id')), 'count']
            ],
            where: {
                source: { [Op.ne]: null },
                companyId: req.user.companyId
            },
            group: ['source'],
            order: [['source', 'ASC']]
        });

        // Get all unique departments
        const departments = await Contact.findAll({
            attributes: [
                'department',
                [Contact.sequelize.fn('COUNT', Contact.sequelize.col('id')), 'count']
            ],
            where: {
                department: { [Op.ne]: null },
                companyId: req.user.companyId
            },
            group: ['department'],
            order: [['department', 'ASC']]
        });

        // Get all unique cities
        const cities = await Contact.findAll({
            attributes: [
                'city',
                [Contact.sequelize.fn('COUNT', Contact.sequelize.col('id')), 'count']
            ],
            where: {
                city: { [Op.ne]: null },
                companyId: req.user.companyId
            },
            group: ['city'],
            order: [['city', 'ASC']]
        });

        // Get all unique states
        const states = await Contact.findAll({
            attributes: [
                'state',
                [Contact.sequelize.fn('COUNT', Contact.sequelize.col('id')), 'count']
            ],
            where: {
                state: { [Op.ne]: null },
                companyId: req.user.companyId
            },
            group: ['state'],
            order: [['state', 'ASC']]
        });

        // Get all unique countries
        const countries = await Contact.findAll({
            attributes: [
                'country',
                [Contact.sequelize.fn('COUNT', Contact.sequelize.col('id')), 'count']
            ],
            where: {
                country: { [Op.ne]: null },
                companyId: req.user.companyId
            },
            group: ['country'],
            order: [['country', 'ASC']]
        });

        res.json({
            sources: sources.map(s => ({ value: s.source, count: s.dataValues.count })),
            departments: departments.map(d => ({ value: d.department, count: d.dataValues.count })),
            cities: cities.map(c => ({ value: c.city, count: c.dataValues.count })),
            states: states.map(s => ({ value: s.state, count: s.dataValues.count })),
            countries: countries.map(c => ({ value: c.country, count: c.dataValues.count }))
        });
    } catch (error) {
        console.error('Error fetching filter options:', error);
        res.status(500).json({ message: 'Failed to fetch filter options' });
    }
});

// GET /api/contacts/:id - Get a specific contact
router.get('/:id', protect, async (req, res) => {
    try {
        const contact = await Contact.findByPk(req.params.id, {
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
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
                    model: Sale,
                    as: 'sales',
                    attributes: ['id', 'saleNumber', 'title', 'description', 'status', 'saleDate', 'amount', 'currency', 'totalAmount', 'paymentStatus', 'paymentDate', 'category', 'source'],
                    order: [['saleDate', 'DESC']]
                }
            ]
        });

        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        res.json(contact);
    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).json({ message: 'Failed to fetch contact' });
    }
});

// POST /api/contacts - Create a new contact
router.post('/', protect, async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            mobile,
            jobTitle,
            department,
            address,
            city,
            state,
            zipCode,
            country,
            notes,
            status = 'active',
            source,
            tags,
            companyId,
            assignedTo
        } = req.body;

        // Validation
        if (!firstName || !lastName) {
            return res.status(400).json({ message: 'First name and last name are required' });
        }

        // Check if email is unique (if provided)
        if (email) {
            const existingContact = await Contact.findOne({ where: { email } });
            if (existingContact) {
                return res.status(400).json({ message: 'A contact with this email already exists' });
            }
        }

        // Sanitize data - convert empty strings to null for integer fields
        const sanitizedData = {
            firstName,
            lastName,
            email: email || null,
            phone: phone || null,
            mobile: mobile || null,
            jobTitle: jobTitle || null,
            department: department || null,
            address: address || null,
            city: city || null,
            state: state || null,
            zipCode: zipCode || null,
            country: country || null,
            notes: notes || null,
            status,
            source: source || null,
            tags: tags || [],
            companyId: req.user.companyId, // Automatically set to user's company
            assignedTo: assignedTo && assignedTo !== '' ? parseInt(assignedTo) : null,
            createdBy: req.user.id
        };

        // Create contact with audit context
        const contact = await Contact.create(sanitizedData, getAuditContext(req));

        // Fetch the created contact with associations
        const createdContact = await Contact.findByPk(contact.id, {
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
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

        res.status(201).json(createdContact);
    } catch (error) {
        console.error('Error creating contact:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Failed to create contact' });
    }
});

// PUT /api/contacts/:id - Update a contact
router.put('/:id', protect, async (req, res) => {
    try {
        const contact = await Contact.findByPk(req.params.id);
        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        const {
            firstName,
            lastName,
            email,
            phone,
            mobile,
            jobTitle,
            department,
            address,
            city,
            state,
            zipCode,
            country,
            notes,
            status,
            source,
            tags,
            companyId,
            assignedTo
        } = req.body;

        // Validation
        if (!firstName || !lastName) {
            return res.status(400).json({ message: 'First name and last name are required' });
        }

        // Check if email is unique (if changed)
        if (email && email !== contact.email) {
            const existingContact = await Contact.findOne({ where: { email } });
            if (existingContact) {
                return res.status(400).json({ message: 'A contact with this email already exists' });
            }
        }

        // Sanitize data - convert empty strings to null for integer fields
        const sanitizedData = {
            firstName,
            lastName,
            email: email || null,
            phone: phone || null,
            mobile: mobile || null,
            jobTitle: jobTitle || null,
            department: department || null,
            address: address || null,
            city: city || null,
            state: state || null,
            zipCode: zipCode || null,
            country: country || null,
            notes: notes || null,
            status,
            source: source || null,
            tags: tags || [],
            companyId: contact.companyId, // Keep the original company ID
            assignedTo: assignedTo && assignedTo !== '' ? parseInt(assignedTo) : null
        };

        // Update contact with audit context
        await contact.update(sanitizedData, getAuditContext(req));

        // Fetch the updated contact with associations
        const updatedContact = await Contact.findByPk(contact.id, {
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
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

        res.json(updatedContact);
    } catch (error) {
        console.error('Error updating contact:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Failed to update contact' });
    }
});

// DELETE /api/contacts/:id - Delete a contact
router.delete('/:id', protect, async (req, res) => {
    try {
        const contact = await Contact.findByPk(req.params.id);
        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        // Store contact data for potential undo
        const deletedContact = {
            id: contact.id,
            data: contact.toJSON(),
            deletedAt: new Date()
        };

        // Delete contact with audit context
        await contact.destroy(getAuditContext(req));

        res.json({ 
            message: 'Contact deleted successfully',
            deletedContact: deletedContact
        });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ message: 'Failed to delete contact' });
    }
});

// POST /api/contacts/:id/undo - Undo contact deletion
router.post('/:id/undo', protect, async (req, res) => {
    try {
        const { deletedContact } = req.body;
        
        if (!deletedContact || !deletedContact.data) {
            return res.status(400).json({ message: 'Invalid deleted contact data' });
        }

        // Check if contact still exists (shouldn't)
        const existingContact = await Contact.findByPk(req.params.id);
        if (existingContact) {
            return res.status(400).json({ message: 'Contact still exists' });
        }

        // Recreate the contact
        const contact = await Contact.create(deletedContact.data);

        // Fetch the recreated contact with associations
        const recreatedContact = await Contact.findByPk(contact.id, {
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
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

        res.json({
            message: 'Contact restored successfully',
            contact: recreatedContact
        });
    } catch (error) {
        console.error('Error restoring contact:', error);
        res.status(500).json({ message: 'Failed to restore contact' });
    }
});

// GET /api/contacts/stats - Get contact statistics
router.get('/stats/overview', protect, async (req, res) => {
    try {
        const totalContacts = await Contact.count();
        const activeContacts = await Contact.count({ where: { status: 'active' } });
        const inactiveContacts = await Contact.count({ where: { status: 'inactive' } });
        const prospectContacts = await Contact.count({ where: { status: 'prospect' } });

        // Contacts by source
        const contactsBySource = await Contact.findAll({
            attributes: [
                'source',
                [Contact.sequelize.fn('COUNT', Contact.sequelize.col('id')), 'count']
            ],
            where: {
                source: { [Op.ne]: null }
            },
            group: ['source'],
            order: [[Contact.sequelize.fn('COUNT', Contact.sequelize.col('id')), 'DESC']]
        });

        // Recent contacts (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentContacts = await Contact.count({
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        res.json({
            totalContacts,
            activeContacts,
            inactiveContacts,
            prospectContacts,
            contactsBySource,
            recentContacts
        });
    } catch (error) {
        console.error('Error fetching contact stats:', error);
        res.status(500).json({ message: 'Failed to fetch contact statistics' });
    }
});

module.exports = router; 