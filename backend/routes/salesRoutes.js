const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Sale = require('../models/Sale');
const Company = require('../models/Company');
const User = require('../models/User');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const ListMembership = require('../models/ListMembership');
const { Op } = require('sequelize');

// GET /api/sales - Get all sales with pagination and filtering
router.get('/', protect, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            status,
            paymentStatus,
            assignedTo,
            category,
            source,
            company,
            contact,
            lead,
            opportunity,
            listId,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        const whereClause = {};

        // Search functionality
        if (search) {
            whereClause[Op.or] = [
                { saleNumber: { [Op.iLike]: `%${search}%` } },
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
                { category: { [Op.iLike]: `%${search}%` } },
                { source: { [Op.iLike]: `%${search}%` } },
                { notes: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Filter by status
        if (status) {
            whereClause.status = status;
        }

        // Filter by payment status
        if (paymentStatus) {
            whereClause.paymentStatus = paymentStatus;
        }

        // Filter by company - only show sales from user's company
        whereClause.companyId = req.user.companyId;

        // Filter by assigned user
        if (assignedTo) {
            whereClause.assignedTo = assignedTo;
        }

        // Filter by category
        if (category) {
            whereClause.category = { [Op.iLike]: `%${category}%` };
        }

        // Filter by source
        if (source) {
            whereClause.source = { [Op.iLike]: `%${source}%` };
        }

        // Filter by specific company
        if (company) {
            whereClause.companyId = company;
        }

        // Filter by contact
        if (contact) {
            whereClause.contactId = contact;
        }

        // Filter by lead
        if (lead) {
            whereClause.leadId = lead;
        }

        // Filter by opportunity
        if (opportunity) {
            whereClause.opportunityId = opportunity;
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
                },
                {
                    model: Lead,
                    as: 'lead',
                    attributes: ['id', 'title', 'status']
                },
                {
                    model: Opportunity,
                    as: 'opportunity',
                    attributes: ['id', 'name', 'stage']
                }
            ],
            order: [[sortBy, sortOrder.toUpperCase()]],
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        // Filter by list if specified
        if (listId) {
            // Get sale IDs from the list
            const listMemberships = await ListMembership.findAll({
                where: {
                    listId: listId,
                    entityType: 'sale'
                },
                attributes: ['entityId']
            });
            
            const saleIds = listMemberships.map(m => m.entityId);
            
            if (saleIds.length > 0) {
                whereClause.id = { [Op.in]: saleIds };
            } else {
                // If list is empty, return no sales
                return res.json({
                    sales: [],
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: parseInt(limit)
                    }
                });
            }
        }

        const { count, rows: sales } = await Sale.findAndCountAll(queryOptions);

        res.json({
            sales,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ message: 'Failed to fetch sales' });
    }
});

// GET /api/sales/filter-options - Get available filter options
router.get('/filter-options', protect, async (req, res) => {
    try {
        // Get all unique categories
        const categories = await Sale.findAll({
            attributes: [
                'category',
                [Sale.sequelize.fn('COUNT', Sale.sequelize.col('id')), 'count']
            ],
            where: {
                category: { [Op.ne]: null },
                companyId: req.user.companyId
            },
            group: ['category'],
            order: [['category', 'ASC']]
        });

        // Get all unique sources
        const sources = await Sale.findAll({
            attributes: [
                'source',
                [Sale.sequelize.fn('COUNT', Sale.sequelize.col('id')), 'count']
            ],
            where: {
                source: { [Op.ne]: null },
                companyId: req.user.companyId
            },
            group: ['source'],
            order: [['source', 'ASC']]
        });

        // Get all unique payment methods
        const paymentMethods = await Sale.findAll({
            attributes: [
                'paymentMethod',
                [Sale.sequelize.fn('COUNT', Sale.sequelize.col('id')), 'count']
            ],
            where: {
                paymentMethod: { [Op.ne]: null },
                companyId: req.user.companyId
            },
            group: ['paymentMethod'],
            order: [['paymentMethod', 'ASC']]
        });

        res.json({
            categories: categories.map(c => ({ value: c.category, count: c.dataValues.count })),
            sources: sources.map(s => ({ value: s.source, count: s.dataValues.count })),
            paymentMethods: paymentMethods.map(pm => ({ value: pm.paymentMethod, count: pm.dataValues.count })),
            statuses: [
                { value: 'pending', label: 'Pending' },
                { value: 'processing', label: 'Processing' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'refunded', label: 'Refunded' }
            ],
            paymentStatuses: [
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
                { value: 'partially_paid', label: 'Partially Paid' },
                { value: 'failed', label: 'Failed' },
                { value: 'refunded', label: 'Refunded' }
            ]
        });
    } catch (error) {
        console.error('Error fetching filter options:', error);
        res.status(500).json({ message: 'Failed to fetch filter options' });
    }
});

// GET /api/sales/:id - Get a specific sale
router.get('/:id', protect, async (req, res) => {
    try {
        const sale = await Sale.findByPk(req.params.id, {
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
                },
                {
                    model: Lead,
                    as: 'lead',
                    attributes: ['id', 'title', 'status']
                },
                {
                    model: Opportunity,
                    as: 'opportunity',
                    attributes: ['id', 'name', 'stage']
                }
            ]
        });

        if (!sale) {
            return res.status(404).json({ message: 'Sale not found' });
        }

        res.json(sale);
    } catch (error) {
        console.error('Error fetching sale:', error);
        res.status(500).json({ message: 'Failed to fetch sale' });
    }
});

// POST /api/sales - Create a new sale
router.post('/', protect, async (req, res) => {
    try {
        const {
            saleNumber,
            title,
            description,
            status = 'pending',
            saleDate,
            amount,
            currency = 'USD',
            discountAmount = 0,
            taxAmount = 0,
            totalAmount,
            paymentMethod,
            paymentStatus = 'pending',
            paymentDate,
            commissionRate = 0,
            commissionAmount = 0,
            category,
            source,
            notes,
            tags,
            contactId,
            leadId,
            opportunityId,
            assignedTo
        } = req.body;

        // Validation
        if (!title || !saleDate || !amount || !totalAmount) {
            return res.status(400).json({ message: 'Title, sale date, amount, and total amount are required' });
        }

        // Sanitize data
        const sanitizedData = {
            saleNumber,
            title,
            description: description || null,
            status,
            saleDate,
            amount: parseFloat(amount),
            currency,
            discountAmount: parseFloat(discountAmount) || 0,
            taxAmount: parseFloat(taxAmount) || 0,
            totalAmount: parseFloat(totalAmount),
            paymentMethod: paymentMethod || null,
            paymentStatus,
            paymentDate: paymentDate || null,
            commissionRate: parseFloat(commissionRate) || 0,
            commissionAmount: parseFloat(commissionAmount) || 0,
            category: category || null,
            source: source || null,
            notes: notes || null,
            tags: tags || [],
            companyId: req.user.companyId, // Automatically set to user's company
            contactId: contactId && contactId !== '' ? parseInt(contactId) : null,
            leadId: leadId && leadId !== '' ? parseInt(leadId) : null,
            opportunityId: opportunityId && opportunityId !== '' ? parseInt(opportunityId) : null,
            assignedTo: assignedTo && assignedTo !== '' ? parseInt(assignedTo) : null,
            createdBy: req.user.id
        };

        const sale = await Sale.create(sanitizedData);

        // Fetch the created sale with associations
        const createdSale = await Sale.findByPk(sale.id, {
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
                },
                {
                    model: Lead,
                    as: 'lead',
                    attributes: ['id', 'title', 'status']
                },
                {
                    model: Opportunity,
                    as: 'opportunity',
                    attributes: ['id', 'name', 'stage']
                }
            ]
        });

        res.status(201).json(createdSale);
    } catch (error) {
        console.error('Error creating sale:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Failed to create sale' });
    }
});

// PUT /api/sales/:id - Update a sale
router.put('/:id', protect, async (req, res) => {
    try {
        const sale = await Sale.findByPk(req.params.id);
        if (!sale) {
            return res.status(404).json({ message: 'Sale not found' });
        }

        const {
            saleNumber,
            title,
            description,
            status,
            saleDate,
            amount,
            currency,
            discountAmount,
            taxAmount,
            totalAmount,
            paymentMethod,
            paymentStatus,
            paymentDate,
            commissionRate,
            commissionAmount,
            category,
            source,
            notes,
            tags,
            contactId,
            leadId,
            opportunityId,
            assignedTo
        } = req.body;

        // Validation
        if (!title || !saleDate || !amount || !totalAmount) {
            return res.status(400).json({ message: 'Title, sale date, amount, and total amount are required' });
        }

        // Sanitize data
        const sanitizedData = {
            saleNumber,
            title,
            description: description || null,
            status,
            saleDate,
            amount: parseFloat(amount),
            currency,
            discountAmount: parseFloat(discountAmount) || 0,
            taxAmount: parseFloat(taxAmount) || 0,
            totalAmount: parseFloat(totalAmount),
            paymentMethod: paymentMethod || null,
            paymentStatus,
            paymentDate: paymentDate || null,
            commissionRate: parseFloat(commissionRate) || 0,
            commissionAmount: parseFloat(commissionAmount) || 0,
            category: category || null,
            source: source || null,
            notes: notes || null,
            tags: tags || [],
            companyId: sale.companyId, // Keep the original company ID
            contactId: contactId && contactId !== '' ? parseInt(contactId) : null,
            leadId: leadId && leadId !== '' ? parseInt(leadId) : null,
            opportunityId: opportunityId && opportunityId !== '' ? parseInt(opportunityId) : null,
            assignedTo: assignedTo && assignedTo !== '' ? parseInt(assignedTo) : null
        };

        await sale.update(sanitizedData);

        // Fetch the updated sale with associations
        const updatedSale = await Sale.findByPk(sale.id, {
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
                },
                {
                    model: Lead,
                    as: 'lead',
                    attributes: ['id', 'title', 'status']
                },
                {
                    model: Opportunity,
                    as: 'opportunity',
                    attributes: ['id', 'name', 'stage']
                }
            ]
        });

        res.json(updatedSale);
    } catch (error) {
        console.error('Error updating sale:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Failed to update sale' });
    }
});

// DELETE /api/sales/:id - Delete a sale
router.delete('/:id', protect, async (req, res) => {
    try {
        const sale = await Sale.findByPk(req.params.id);
        if (!sale) {
            return res.status(404).json({ message: 'Sale not found' });
        }

        await sale.destroy();

        res.json({ message: 'Sale deleted successfully' });
    } catch (error) {
        console.error('Error deleting sale:', error);
        res.status(500).json({ message: 'Failed to delete sale' });
    }
});

// GET /api/sales/stats/overview - Get sale statistics
router.get('/stats/overview', protect, async (req, res) => {
    try {
        const totalSales = await Sale.count({ where: { companyId: req.user.companyId } });
        const pendingSales = await Sale.count({ where: { status: 'pending', companyId: req.user.companyId } });
        const completedSales = await Sale.count({ where: { status: 'completed', companyId: req.user.companyId } });
        const cancelledSales = await Sale.count({ where: { status: 'cancelled', companyId: req.user.companyId } });

        // Sales by status
        const salesByStatus = await Sale.findAll({
            attributes: [
                'status',
                [Sale.sequelize.fn('COUNT', Sale.sequelize.col('id')), 'count']
            ],
            where: {
                companyId: req.user.companyId
            },
            group: ['status'],
            order: [[Sale.sequelize.fn('COUNT', Sale.sequelize.col('id')), 'DESC']]
        });

        // Total revenue
        const totalRevenue = await Sale.sum('totalAmount', {
            where: {
                companyId: req.user.companyId,
                status: 'completed'
            }
        });

        // Recent sales (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSales = await Sale.count({
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo },
                companyId: req.user.companyId
            }
        });

        res.json({
            totalSales,
            pendingSales,
            completedSales,
            cancelledSales,
            salesByStatus,
            totalRevenue: totalRevenue || 0,
            recentSales
        });
    } catch (error) {
        console.error('Error fetching sale stats:', error);
        res.status(500).json({ message: 'Failed to fetch sale statistics' });
    }
});

module.exports = router;