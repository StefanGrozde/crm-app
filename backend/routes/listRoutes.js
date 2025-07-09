const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const List = require('../models/List');
const ListMembership = require('../models/ListMembership');
const ListShare = require('../models/ListShare');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const { Op } = require('sequelize');

// GET /api/lists - Get all lists for the user's company
router.get('/', protect, async (req, res) => {
    try {
        const { entityType, includeShared = true } = req.query;
        
        const whereClause = {
            companyId: req.user.companyId
        };
        
        if (entityType) {
            whereClause.entityType = entityType;
        }
        
        // Base query for owned lists
        const ownedLists = await List.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                }
            ],
            order: [['isSystem', 'ASC'], ['name', 'ASC']]
        });
        
        let allLists = ownedLists;
        
        // Include shared lists if requested
        if (includeShared === 'true') {
            const sharedLists = await ListShare.findAll({
                where: {
                    sharedWith: req.user.id
                },
                include: [
                    {
                        model: List,
                        where: entityType ? { entityType } : {},
                        include: [
                            {
                                model: User,
                                as: 'creator',
                                attributes: ['id', 'username', 'email']
                            }
                        ]
                    }
                ]
            });
            
            // Add shared lists to the result
            const sharedListsData = sharedLists.map(share => ({
                ...share.List.toJSON(),
                permission: share.permission,
                sharedBy: share.sharedBy,
                isShared: true
            }));
            
            allLists = [...ownedLists, ...sharedListsData];
        }
        
        res.json(allLists);
    } catch (error) {
        console.error('Error fetching lists:', error);
        res.status(500).json({ message: 'Failed to fetch lists' });
    }
});

// GET /api/lists/:id - Get a specific list with its members
router.get('/:id', protect, async (req, res) => {
    try {
        const list = await List.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                }
            ]
        });
        
        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }
        
        // Check if user has access to this list
        const hasAccess = list.companyId === req.user.companyId || 
                         list.createdBy === req.user.id ||
                         await ListShare.findOne({
                             where: { listId: req.params.id, sharedWith: req.user.id }
                         });
        
        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Get list members
        const members = await ListMembership.findAll({
            where: { listId: req.params.id },
            include: [
                {
                    model: User,
                    as: 'addedByUser',
                    attributes: ['id', 'username', 'email']
                }
            ],
            order: [['addedAt', 'DESC']]
        });
        
        res.json({
            ...list.toJSON(),
            members
        });
    } catch (error) {
        console.error('Error fetching list:', error);
        res.status(500).json({ message: 'Failed to fetch list' });
    }
});

// POST /api/lists - Create a new list
router.post('/', protect, async (req, res) => {
    try {
        const { name, description, type, entityType, color, icon, smartFilters } = req.body;
        
        if (!name || !entityType) {
            return res.status(400).json({ message: 'Name and entity type are required' });
        }
        
        const list = await List.create({
            name,
            description,
            type: type || 'static',
            entityType,
            color: color || '#3B82F6',
            icon: icon || 'list',
            smartFilters: type === 'smart' ? smartFilters : null,
            companyId: req.user.companyId,
            createdBy: req.user.id
        });
        
        const createdList = await List.findByPk(list.id, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                }
            ]
        });
        
        res.status(201).json(createdList);
    } catch (error) {
        console.error('Error creating list:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Failed to create list' });
    }
});

// PUT /api/lists/:id - Update a list
router.put('/:id', protect, async (req, res) => {
    try {
        const list = await List.findByPk(req.params.id);
        
        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }
        
        // Check if user can edit this list
        if (list.createdBy !== req.user.id && list.companyId !== req.user.companyId) {
            // Check if user has edit permission through sharing
            const share = await ListShare.findOne({
                where: {
                    listId: req.params.id,
                    sharedWith: req.user.id,
                    permission: { [Op.in]: ['edit', 'admin'] }
                }
            });
            
            if (!share) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }
        
        // System lists cannot be modified
        if (list.isSystem) {
            return res.status(400).json({ message: 'System lists cannot be modified' });
        }
        
        const { name, description, type, color, icon, smartFilters } = req.body;
        
        await list.update({
            name: name || list.name,
            description: description !== undefined ? description : list.description,
            type: type || list.type,
            color: color || list.color,
            icon: icon || list.icon,
            smartFilters: type === 'smart' ? smartFilters : null
        });
        
        const updatedList = await List.findByPk(list.id, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                }
            ]
        });
        
        res.json(updatedList);
    } catch (error) {
        console.error('Error updating list:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Failed to update list' });
    }
});

// DELETE /api/lists/:id - Delete a list
router.delete('/:id', protect, async (req, res) => {
    try {
        const list = await List.findByPk(req.params.id);
        
        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }
        
        // Only creator can delete the list
        if (list.createdBy !== req.user.id) {
            return res.status(403).json({ message: 'Only the creator can delete this list' });
        }
        
        // System lists cannot be deleted
        if (list.isSystem) {
            return res.status(400).json({ message: 'System lists cannot be deleted' });
        }
        
        await list.destroy();
        
        res.json({ message: 'List deleted successfully' });
    } catch (error) {
        console.error('Error deleting list:', error);
        res.status(500).json({ message: 'Failed to delete list' });
    }
});

// POST /api/lists/:id/members - Add entities to a list
router.post('/:id/members', protect, async (req, res) => {
    try {
        const { entities } = req.body; // Array of { entityType, entityId }
        
        if (!entities || !Array.isArray(entities)) {
            return res.status(400).json({ message: 'Entities array is required' });
        }
        
        const list = await List.findByPk(req.params.id);
        
        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }
        
        // Check if user has access to modify this list
        const hasAccess = list.companyId === req.user.companyId || 
                         list.createdBy === req.user.id ||
                         await ListShare.findOne({
                             where: { 
                                 listId: req.params.id, 
                                 sharedWith: req.user.id,
                                 permission: { [Op.in]: ['edit', 'admin'] }
                             }
                         });
        
        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const memberships = [];
        const errors = [];
        
        for (const entity of entities) {
            try {
                // Validate entity type matches list type (unless list is mixed)
                if (list.entityType !== 'mixed' && entity.entityType !== list.entityType) {
                    errors.push(`Entity type ${entity.entityType} doesn't match list type ${list.entityType}`);
                    continue;
                }
                
                // Check if entity exists and user has access
                let entityExists = false;
                if (entity.entityType === 'contact') {
                    entityExists = await Contact.findOne({
                        where: { id: entity.entityId, companyId: req.user.companyId }
                    });
                } else if (entity.entityType === 'lead') {
                    entityExists = await Lead.findOne({
                        where: { id: entity.entityId, companyId: req.user.companyId }
                    });
                } else if (entity.entityType === 'opportunity') {
                    entityExists = await Opportunity.findOne({
                        where: { id: entity.entityId, companyId: req.user.companyId }
                    });
                }
                
                if (!entityExists) {
                    errors.push(`${entity.entityType} with ID ${entity.entityId} not found`);
                    continue;
                }
                
                const membership = await ListMembership.create({
                    listId: req.params.id,
                    entityType: entity.entityType,
                    entityId: entity.entityId,
                    addedBy: req.user.id
                });
                
                memberships.push(membership);
            } catch (error) {
                if (error.name === 'SequelizeUniqueConstraintError') {
                    errors.push(`${entity.entityType} ${entity.entityId} is already in the list`);
                } else {
                    errors.push(`Failed to add ${entity.entityType} ${entity.entityId}: ${error.message}`);
                }
            }
        }
        
        res.json({
            added: memberships.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Error adding members to list:', error);
        res.status(500).json({ message: 'Failed to add members to list' });
    }
});

// DELETE /api/lists/:id/members/:membershipId - Remove entity from list
router.delete('/:id/members/:membershipId', protect, async (req, res) => {
    try {
        const membership = await ListMembership.findByPk(req.params.membershipId);
        
        if (!membership) {
            return res.status(404).json({ message: 'Membership not found' });
        }
        
        const list = await List.findByPk(req.params.id);
        
        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }
        
        // Check if user has access to modify this list
        const hasAccess = list.companyId === req.user.companyId || 
                         list.createdBy === req.user.id ||
                         await ListShare.findOne({
                             where: { 
                                 listId: req.params.id, 
                                 sharedWith: req.user.id,
                                 permission: { [Op.in]: ['edit', 'admin'] }
                             }
                         });
        
        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        await membership.destroy();
        
        res.json({ message: 'Member removed from list successfully' });
    } catch (error) {
        console.error('Error removing member from list:', error);
        res.status(500).json({ message: 'Failed to remove member from list' });
    }
});

module.exports = router;