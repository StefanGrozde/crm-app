const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// @desc    Get business filter options
// @route   GET /api/businesses/filter-options
// @access  Private
router.get('/filter-options', protect, async (req, res) => {
    try {
        // Return static filter options for now
        // In a real implementation, you would query your business database
        const filterOptions = {
            industries: [
                'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
                'Retail', 'Real Estate', 'Consulting', 'Marketing', 'Legal',
                'Non-profit', 'Government', 'Entertainment', 'Transportation', 'Other'
            ],
            sizes: [
                '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
            ],
            statuses: ['active', 'inactive', 'prospect']
        };
        
        res.json(filterOptions);
    } catch (error) {
        console.error('Error fetching business filter options:', error);
        res.status(500).json({ message: 'Failed to fetch filter options' });
    }
});

// @desc    Get all businesses
// @route   GET /api/businesses
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        // For now, return mock data
        // In a real implementation, you would query your business database
        const mockBusinesses = [
            {
                id: 1,
                name: 'Tech Solutions Inc',
                industry: 'Technology',
                size: '51-200',
                website: 'https://techsolutions.com',
                phoneNumber: '+1-555-0123',
                email: 'contact@techsolutions.com',
                status: 'active'
            },
            {
                id: 2,
                name: 'Healthcare Partners',
                industry: 'Healthcare',
                size: '201-500',
                website: 'https://healthcarepartners.com',
                phoneNumber: '+1-555-0124',
                email: 'info@healthcarepartners.com',
                status: 'active'
            },
            {
                id: 3,
                name: 'Global Finance Corp',
                industry: 'Finance',
                size: '1000+',
                website: 'https://globalfinance.com',
                phoneNumber: '+1-555-0125',
                email: 'contact@globalfinance.com',
                status: 'prospect'
            }
        ];
        
        res.json({
            businesses: mockBusinesses,
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalItems: mockBusinesses.length,
                itemsPerPage: 10
            }
        });
    } catch (error) {
        console.error('Error fetching businesses:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Create a new business
// @route   POST /api/businesses
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        // For now, just return success
        // In a real implementation, you would save to your business database
        res.status(201).json({ message: 'Business created successfully' });
    } catch (error) {
        console.error('Error creating business:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Update a business
// @route   PUT /api/businesses/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        // For now, just return success
        // In a real implementation, you would update your business database
        res.json({ message: 'Business updated successfully' });
    } catch (error) {
        console.error('Error updating business:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Delete a business
// @route   DELETE /api/businesses/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        // For now, just return success
        // In a real implementation, you would delete from your business database
        res.json({ message: 'Business deleted successfully' });
    } catch (error) {
        console.error('Error deleting business:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router; 