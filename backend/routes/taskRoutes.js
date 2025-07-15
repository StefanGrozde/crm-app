const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Task = require('../models/Task');
const TaskAssignment = require('../models/TaskAssignment');
const User = require('../models/User');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Sale = require('../models/Sale');
const { Op } = require('sequelize');
const NotificationService = require('../services/NotificationService');

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks for the company with pagination and filtering
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            status = '', 
            priority = '', 
            assignedTo = '',
            category = '',
            assignmentType = '',
            overdue = ''
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Build where clause
        const whereClause = {
            companyId: req.user.companyId,
            archived: false // Only show non-archived tasks by default
        };

        // Add search filter
        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
                { notes: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Add status filter
        if (status) {
            whereClause.status = status;
        }

        // Add priority filter
        if (priority) {
            whereClause.priority = priority;
        }

        // Add category filter
        if (category) {
            whereClause.category = { [Op.iLike]: `%${category}%` };
        }

        // Add assignment type filter
        if (assignmentType) {
            whereClause.assignmentType = assignmentType;
        }

        // Add overdue filter
        if (overdue === 'true') {
            whereClause.dueDate = { [Op.lt]: new Date() };
            whereClause.status = { [Op.ne]: 'completed' };
        }

        // Base query options
        const queryOptions = {
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: TaskAssignment,
                    as: 'assignments',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'email']
                        }
                    ]
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                    required: false
                },
                {
                    model: Lead,
                    as: 'lead',
                    attributes: ['id', 'title'],
                    required: false
                },
                {
                    model: Opportunity,
                    as: 'opportunity',
                    attributes: ['id', 'name'],
                    required: false
                },
                {
                    model: Sale,
                    as: 'sale',
                    attributes: ['id', 'title', 'saleNumber'],
                    required: false
                }
            ],
            order: [
                ['priority', 'DESC'],
                ['dueDate', 'ASC'],
                ['created_at', 'DESC']
            ],
            limit: parseInt(limit),
            offset: offset
        };

        // Handle assignedTo filter (requires special handling for task assignments)
        if (assignedTo) {
            queryOptions.include[1].where = {
                userId: assignedTo
            };
            queryOptions.include[1].required = true;
        }

        const { count, rows: tasks } = await Task.findAndCountAll(queryOptions);

        // Calculate pagination
        const totalPages = Math.ceil(count / parseInt(limit));
        const hasNextPage = parseInt(page) < totalPages;
        const hasPrevPage = parseInt(page) > 1;

        res.json({
            tasks,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit),
                hasNextPage,
                hasPrevPage
            }
        });

    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ 
            message: 'Failed to fetch tasks',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task by ID
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
    try {
        const task = await Task.findOne({
            where: {
                id: req.params.id,
                companyId: req.user.companyId,
                archived: false // Only show non-archived tasks
            },
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: TaskAssignment,
                    as: 'assignments',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'email']
                        }
                    ]
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                    required: false
                },
                {
                    model: Lead,
                    as: 'lead',
                    attributes: ['id', 'title'],
                    required: false
                },
                {
                    model: Opportunity,
                    as: 'opportunity',
                    attributes: ['id', 'name'],
                    required: false
                },
                {
                    model: Sale,
                    as: 'sale',
                    attributes: ['id', 'title', 'saleNumber'],
                    required: false
                }
            ]
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json(task);

    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ 
            message: 'Failed to fetch task',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   POST /api/tasks
 * @desc    Create new task
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
    try {
        const {
            title,
            description,
            status = 'pending',
            priority = 'medium',
            dueDate,
            estimatedHours,
            assignmentType = 'individual',
            assignedUsers = [], // Array of user IDs
            assignedToAll = false,
            category,
            tags = [],
            notes,
            contactId,
            leadId,
            opportunityId,
            saleId
        } = req.body;

        // Validate required fields
        if (!title) {
            return res.status(400).json({ message: 'Task title is required' });
        }

        // Helper function to validate and parse dates
        const parseDate = (dateValue) => {
            if (dateValue === null || dateValue === '' || dateValue === undefined) {
                return null;
            }
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? null : parsed;
        };

        // Create the task
        const task = await Task.create({
            title,
            description,
            status,
            priority,
            dueDate: parseDate(dueDate),
            estimatedHours: estimatedHours || null,
            assignmentType,
            assignedToAll: assignmentType === 'all_company' ? true : assignedToAll,
            category,
            tags,
            notes,
            contactId: contactId || null,
            leadId: leadId || null,
            opportunityId: opportunityId || null,
            saleId: saleId || null,
            companyId: req.user.companyId,
            createdBy: req.user.id
        });

        // Handle task assignments based on assignment type
        if (assignmentType === 'all_company' || assignedToAll) {
            // Assign to all users in the company
            const allUsers = await User.findAll({
                where: { companyId: req.user.companyId },
                attributes: ['id']
            });

            const assignments = allUsers.map(user => ({
                taskId: task.id,
                userId: user.id
            }));

            await TaskAssignment.bulkCreate(assignments);

            // Create assignment notifications for all company users
            for (const user of allUsers) {
                try {
                    await NotificationService.createTaskAssignmentNotification(
                        task, 
                        user.id, 
                        req.user
                    );
                } catch (notificationError) {
                    console.error('Error creating assignment notification:', notificationError);
                }
            }

        } else if (assignmentType === 'individual' || assignmentType === 'multiple') {
            // Assign to specific users
            if (assignedUsers && assignedUsers.length > 0) {
                const assignments = assignedUsers.map(userId => ({
                    taskId: task.id,
                    userId: parseInt(userId)
                }));

                await TaskAssignment.bulkCreate(assignments);

                // Create assignment notifications for specific users
                for (const userId of assignedUsers) {
                    try {
                        await NotificationService.createTaskAssignmentNotification(
                            task, 
                            parseInt(userId), 
                            req.user
                        );
                    } catch (notificationError) {
                        console.error('Error creating assignment notification:', notificationError);
                    }
                }
            }
        }

        // Fetch the created task with all associations
        const createdTask = await Task.findByPk(task.id, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: TaskAssignment,
                    as: 'assignments',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'email']
                        }
                    ]
                }
            ]
        });

        res.status(201).json(createdTask);

    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ 
            message: 'Failed to create task',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task
 * @access  Private
 */
router.put('/:id', protect, async (req, res) => {
    try {
        console.log('Task update request:', {
            taskId: req.params.id,
            user: req.user.username,
            companyId: req.user.companyId,
            body: req.body
        });

        const task = await Task.findOne({
            where: {
                id: req.params.id,
                companyId: req.user.companyId
            }
        });

        if (!task) {
            console.log('Task not found:', req.params.id);
            return res.status(404).json({ message: 'Task not found' });
        }

        const {
            title,
            description,
            status,
            priority,
            dueDate,
            completedDate,
            estimatedHours,
            actualHours,
            assignmentType,
            assignedUsers = [],
            assignedToAll,
            category,
            tags,
            notes,
            contactId,
            leadId,
            opportunityId,
            saleId
        } = req.body;

        // Helper function to validate and parse dates
        const parseDate = (dateValue) => {
            if (dateValue === null || dateValue === '' || dateValue === undefined) {
                return null;
            }
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? null : parsed;
        };

        // Track status change for notifications
        const oldStatus = task.status;
        const newStatus = status || task.status;
        const statusChanged = oldStatus !== newStatus;

        // Update task fields with audit context
        await task.update({
            title: title || task.title,
            description: description !== undefined ? description : task.description,
            status: status || task.status,
            priority: priority || task.priority,
            dueDate: dueDate !== undefined ? parseDate(dueDate) : task.dueDate,
            completedDate: completedDate !== undefined ? parseDate(completedDate) : task.completedDate,
            estimatedHours: estimatedHours !== undefined ? estimatedHours : task.estimatedHours,
            actualHours: actualHours !== undefined ? actualHours : task.actualHours,
            assignmentType: assignmentType || task.assignmentType,
            assignedToAll: assignedToAll !== undefined ? assignedToAll : task.assignedToAll,
            category: category !== undefined ? category : task.category,
            tags: tags !== undefined ? tags : task.tags,
            notes: notes !== undefined ? notes : task.notes,
            contactId: contactId !== undefined ? contactId : task.contactId,
            leadId: leadId !== undefined ? leadId : task.leadId,
            opportunityId: opportunityId !== undefined ? opportunityId : task.opportunityId,
            saleId: saleId !== undefined ? saleId : task.saleId
        }, {
            // Pass user context for audit logging
            user: req.user,
            userId: req.user.id,
            companyId: req.user.companyId
        });

        // Handle assignment updates if provided
        if (assignmentType && assignedUsers !== undefined) {
            console.log('Updating assignments:', { assignmentType, assignedUsers });
            
            // Remove existing assignments
            await TaskAssignment.destroy({
                where: { taskId: task.id }
            }, {
                // Pass user context for audit logging
                user: req.user,
                userId: req.user.id,
                companyId: req.user.companyId
            });

            // Create new assignments
            if (assignmentType === 'all_company' || assignedToAll) {
                const allUsers = await User.findAll({
                    where: { companyId: req.user.companyId },
                    attributes: ['id']
                });

                const assignments = allUsers.map(user => ({
                    taskId: task.id,
                    userId: user.id
                }));

                if (assignments.length > 0) {
                    await TaskAssignment.bulkCreate(assignments, {
                        // Pass user context for audit logging
                        user: req.user,
                        userId: req.user.id,
                        companyId: req.user.companyId
                    });
                }

            } else if (assignedUsers && assignedUsers.length > 0) {
                const assignments = assignedUsers.map(userId => ({
                    taskId: task.id,
                    userId: parseInt(userId)
                }));

                await TaskAssignment.bulkCreate(assignments, {
                    // Pass user context for audit logging
                    user: req.user,
                    userId: req.user.id,
                    companyId: req.user.companyId
                });
            }
        }

        // Fetch updated task with full associations
        const updatedTask = await Task.findByPk(task.id, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: TaskAssignment,
                    as: 'assignments',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'email']
                        }
                    ]
                },
                {
                    model: Contact,
                    as: 'contact',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                    required: false
                },
                {
                    model: Lead,
                    as: 'lead',
                    attributes: ['id', 'title'],
                    required: false
                },
                {
                    model: Opportunity,
                    as: 'opportunity',
                    attributes: ['id', 'name'],
                    required: false
                },
                {
                    model: Sale,
                    as: 'sale',
                    attributes: ['id', 'title', 'saleNumber'],
                    required: false
                }
            ]
        });
        
        console.log('Task updated successfully:', updatedTask.id);

        // Create status change notifications if status changed
        if (statusChanged) {
            try {
                // Get assigned user IDs
                const assignedUserIds = updatedTask.assignments.map(assignment => assignment.userId);
                
                if (assignedUserIds.length > 0) {
                    await NotificationService.createTaskStatusChangeNotification(
                        updatedTask,
                        newStatus,
                        req.user,
                        assignedUserIds
                    );
                }
            } catch (notificationError) {
                console.error('Error creating status change notification:', notificationError);
            }
        }

        res.json(updatedTask);

    } catch (error) {
        console.error('Error updating task:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            sql: error.sql
        });
        
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ 
                message: 'Validation error', 
                error: error.errors.map(e => e.message).join(', ')
            });
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ 
                message: 'Invalid reference (contact, user, or related entity not found)' 
            });
        }
        res.status(500).json({ 
            message: 'Failed to update task',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Archive task (soft delete)
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
    try {
        const task = await Task.findOne({
            where: {
                id: req.params.id,
                companyId: req.user.companyId,
                archived: false // Only allow archiving non-archived tasks
            }
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Check if user can archive (creator or admin)
        if (task.createdBy !== req.user.id && req.user.role !== 'Administrator') {
            return res.status(403).json({ message: 'Not authorized to archive this task' });
        }

        // Archive the task instead of deleting
        await task.update({ archived: true });

        res.json({ message: 'Task archived successfully' });

    } catch (error) {
        console.error('Error archiving task:', error);
        res.status(500).json({ 
            message: 'Failed to archive task',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   POST /api/tasks/:id/unarchive
 * @desc    Unarchive task
 * @access  Private
 */
router.post('/:id/unarchive', protect, async (req, res) => {
    try {
        const task = await Task.findOne({
            where: {
                id: req.params.id,
                companyId: req.user.companyId,
                archived: true // Only allow unarchiving archived tasks
            }
        });

        if (!task) {
            return res.status(404).json({ message: 'Archived task not found' });
        }

        // Check if user can unarchive (creator or admin)
        if (task.createdBy !== req.user.id && req.user.role !== 'Administrator') {
            return res.status(403).json({ message: 'Not authorized to unarchive this task' });
        }

        // Unarchive the task
        await task.update({ archived: false });

        res.json({ message: 'Task unarchived successfully' });

    } catch (error) {
        console.error('Error unarchiving task:', error);
        res.status(500).json({ 
            message: 'Failed to unarchive task',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   PUT /api/tasks/:id/assignment/:userId
 * @desc    Update individual task assignment status
 * @access  Private
 */
router.put('/:id/assignment/:userId', protect, async (req, res) => {
    try {
        const { status, hoursLogged, notes } = req.body;

        const assignment = await TaskAssignment.findOne({
            where: {
                taskId: req.params.id,
                userId: req.params.userId
            },
            include: [
                {
                    model: Task,
                    as: 'task',
                    where: { companyId: req.user.companyId }
                }
            ]
        });

        if (!assignment) {
            return res.status(404).json({ message: 'Task assignment not found' });
        }

        // Only the assigned user or admin can update the assignment
        if (parseInt(req.params.userId) !== req.user.id && req.user.role !== 'Administrator') {
            return res.status(403).json({ message: 'Not authorized to update this assignment' });
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (hoursLogged !== undefined) updateData.hoursLogged = hoursLogged;
        if (notes !== undefined) updateData.notes = notes;

        if (status === 'accepted') {
            updateData.acceptedAt = new Date();
        } else if (status === 'completed') {
            updateData.completedAt = new Date();
        }

        await assignment.update(updateData, {
            // Pass user context for audit logging
            user: req.user,
            userId: req.user.id,
            companyId: req.user.companyId
        });

        res.json(assignment);

    } catch (error) {
        console.error('Error updating task assignment:', error);
        res.status(500).json({ 
            message: 'Failed to update task assignment',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   GET /api/tasks/my-tasks
 * @desc    Get tasks assigned to current user
 * @access  Private
 */
router.get('/my-tasks', protect, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status = '', 
            priority = '' 
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const whereClause = {
            companyId: req.user.companyId,
            archived: false // Only show non-archived tasks
        };

        if (status) {
            whereClause.status = status;
        }

        if (priority) {
            whereClause.priority = priority;
        }

        const { count, rows: tasks } = await Task.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: TaskAssignment,
                    as: 'assignments',
                    where: { userId: req.user.id },
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'email']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                }
            ],
            order: [
                ['priority', 'DESC'],
                ['dueDate', 'ASC'],
                ['created_at', 'DESC']
            ],
            limit: parseInt(limit),
            offset: offset
        });

        const totalPages = Math.ceil(count / parseInt(limit));

        res.json({
            tasks,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching user tasks:', error);
        res.status(500).json({ 
            message: 'Failed to fetch user tasks',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;