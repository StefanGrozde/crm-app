const express = require('express');
const router = express.Router();
const UserInvitation = require('../models/UserInvitation');
const User = require('../models/User');
const Company = require('../models/Company');
const { protect } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');

// @desc    Generate invitation URL (Admin only)
// @route   POST /api/invitations
// @access  Private (Admin only)
router.post('/', protect, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Administrator') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        const { email, role = 'Sales Representative' } = req.body;

        // Validate required fields
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Check if invitation already exists and is not expired
        const existingInvitation = await UserInvitation.findOne({
            where: {
                email,
                isUsed: false,
                expiresAt: { [Op.gt]: new Date() }
            }
        });

        if (existingInvitation) {
            return res.status(400).json({ message: 'An active invitation already exists for this email' });
        }

        // Create new invitation
        const invitation = await UserInvitation.create({
            token: UserInvitation.generateToken(),
            email,
            role,
            companyId: req.user.companyId,
            invitedBy: req.user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        });

        // Generate invitation URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const invitationUrl = `${baseUrl}/invite/${invitation.token}`;

        res.status(201).json({
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                expiresAt: invitation.expiresAt,
                invitationUrl
            }
        });
    } catch (error) {
        console.error('Error creating invitation:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get invitation details by token
// @route   GET /api/invitations/:token
// @access  Public
router.get('/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const invitation = await UserInvitation.findOne({
            where: { token },
            include: [
                {
                    model: Company,
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!invitation) {
            return res.status(404).json({ message: 'Invitation not found' });
        }

        if (invitation.isUsed) {
            return res.status(400).json({ message: 'Invitation has already been used' });
        }

        if (invitation.isExpired()) {
            return res.status(400).json({ message: 'Invitation has expired' });
        }

        res.json({
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                expiresAt: invitation.expiresAt,
                company: invitation.Company
            }
        });
    } catch (error) {
        console.error('Error fetching invitation:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Complete user registration via invitation
// @route   POST /api/invitations/:token/complete
// @access  Public
router.post('/:token/complete', async (req, res) => {
    try {
        const { token } = req.params;
        const { username, password } = req.body;

        // Validate required fields
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Find and validate invitation
        const invitation = await UserInvitation.findOne({
            where: { token },
            include: [
                {
                    model: Company,
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!invitation) {
            return res.status(404).json({ message: 'Invitation not found' });
        }

        if (invitation.isUsed) {
            return res.status(400).json({ message: 'Invitation has already been used' });
        }

        if (invitation.isExpired()) {
            return res.status(400).json({ message: 'Invitation has expired' });
        }

        // Check if username already exists
        const existingUser = await User.findOne({
            where: { username }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Create new user
        const newUser = await User.create({
            username,
            email: invitation.email,
            password,
            role: invitation.role,
            companyId: invitation.companyId
        });

        // Mark invitation as used
        await invitation.markAsUsed();

        // Return user data (without password)
        const userResponse = {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            companyId: newUser.companyId,
            company: invitation.Company
        };

        res.status(201).json({
            message: 'User registered successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Error completing invitation:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get all invitations for company (Admin only)
// @route   GET /api/invitations
// @access  Private (Admin only)
router.get('/', protect, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Administrator') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        const invitations = await UserInvitation.findAll({
            where: { companyId: req.user.companyId },
            include: [
                {
                    model: User,
                    as: 'InvitedBy',
                    attributes: ['id', 'username', 'email']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({ invitations });
    } catch (error) {
        console.error('Error fetching invitations:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Delete invitation (Admin only)
// @route   DELETE /api/invitations/:id
// @access  Private (Admin only)
router.delete('/:id', protect, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Administrator') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        const invitation = await UserInvitation.findOne({
            where: { 
                id: req.params.id,
                companyId: req.user.companyId 
            }
        });

        if (!invitation) {
            return res.status(404).json({ message: 'Invitation not found' });
        }

        await invitation.destroy();

        res.json({ message: 'Invitation deleted successfully' });
    } catch (error) {
        console.error('Error deleting invitation:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router; 