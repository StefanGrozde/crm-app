const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Company = require('../models/Company');
const { protect } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// @desc    Get all users with pagination and filtering (Admin only)
// @route   GET /api/users
// @access  Private (Admin only)
router.get('/', protect, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Administrator') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        // Build where clause
        const whereClause = {
            companyId: req.user.companyId
        };
        
        // Add search filter
        if (req.query.search) {
            whereClause[Op.or] = [
                { username: { [Op.iLike]: `%${req.query.search}%` } },
                { email: { [Op.iLike]: `%${req.query.search}%` } }
            ];
        }
        
        // Add role filter
        if (req.query.role) {
            whereClause.role = req.query.role;
        }

        const { count, rows: users } = await User.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Company,
                    attributes: ['id', 'name']
                }
            ],
            attributes: ['id', 'username', 'email', 'role', 'created_at', 'updated_at'],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        const totalPages = Math.ceil(count / limit);
        
        res.json({
            users,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        // req.user is attached by the 'protect' middleware
        const user = req.user;
        res.json({
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get all users (for dropdowns) - simplified version
// @route   GET /api/users/dropdown
// @access  Private
router.get('/dropdown', protect, async (req, res) => {
    try {
        // Return users from the same company
        const users = await User.findAll({
            where: { companyId: req.user.companyId },
            attributes: ['id', 'email', 'username', 'role']
        });
        
        res.json(users);
    } catch (error) {
        console.error('Error fetching users for dropdown:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get single user by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private (Admin only)
router.get('/:id', protect, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Administrator') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        const user = await User.findOne({
            where: { 
                id: req.params.id,
                companyId: req.user.companyId 
            },
            include: [
                {
                    model: Company,
                    attributes: ['id', 'name']
                }
            ],
            attributes: ['id', 'username', 'email', 'role', 'created_at', 'updated_at']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Create new user (Admin only)
// @route   POST /api/users
// @access  Private (Admin only)
router.post('/', protect, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Administrator') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        const { username, email, password, role, companyId } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required' });
        }

        // Check if username or email already exists
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ username }, { email }]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Create new user
        const newUser = await User.create({
            username,
            email,
            password, // Will be hashed by the beforeCreate hook
            role: role || 'Sales Representative',
            companyId: companyId || req.user.companyId
        });

        // Return user without password
        const userResponse = {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            companyId: newUser.companyId,
            created_at: newUser.created_at,
            updated_at: newUser.updated_at
        };

        res.status(201).json(userResponse);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private (Admin only)
router.put('/:id', protect, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Administrator') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        const user = await User.findOne({
            where: { 
                id: req.params.id,
                companyId: req.user.companyId 
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { username, email, role, companyId } = req.body;

        // Check if username or email already exists (excluding current user)
        if (username || email) {
            const existingUser = await User.findOne({
                where: {
                    [Op.or]: [
                        username ? { username } : null,
                        email ? { email } : null
                    ].filter(Boolean),
                    id: { [Op.ne]: req.params.id }
                }
            });

            if (existingUser) {
                return res.status(400).json({ message: 'Username or email already exists' });
            }
        }

        // Update user fields
        if (username) user.username = username;
        if (email) user.email = email;
        if (role) user.role = role;
        if (companyId !== undefined) user.companyId = companyId;

        await user.save();

        // Return updated user
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
            created_at: user.created_at,
            updated_at: user.updated_at
        };

        res.json(userResponse);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
router.delete('/:id', protect, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Administrator') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        // Prevent admin from deleting themselves
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        const user = await User.findOne({
            where: { 
                id: req.params.id,
                companyId: req.user.companyId 
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.destroy();

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (user) {
            user.username = req.body.username || user.username;
            user.email = req.body.email || user.email;
            
            // If you want to allow password changes, you can add this:
            // if (req.body.password) {
            //     user.password = req.body.password; // The hook in User.js will hash it
            // }

            const updatedUser = await user.save();

            res.json({
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;