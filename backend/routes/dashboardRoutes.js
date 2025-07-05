const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { DashboardView, DashboardWidget } = require('../models/DashboardView'); // We will create this model

// @desc    Get all dashboard views for a user
// @route   GET /api/dashboard/views
// @access  Private
router.get('/views', protect, async (req, res) => {
    try {
        const views = await DashboardView.findAll({ where: { userId: req.user.id } });
        res.json(views);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get a single dashboard view with its widgets
// @route   GET /api/dashboard/views/:id
// @access  Private
router.get('/views/:id', protect, async (req, res) => {
    try {
        const view = await DashboardView.findOne({
            where: { id: req.params.id, userId: req.user.id },
            include: [{ model: DashboardWidget, as: 'widgets' }]
        });

        if (!view) {
            return res.status(404).json({ message: 'View not found' });
        }

        res.json(view);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// @desc    Create a new dashboard view
// @route   POST /api/dashboard/views
// @access  Private
router.post('/views', protect, async (req, res) => {
    const { name, layout } = req.body; // layout is an array of widget configs

    if (!name || !layout) {
        return res.status(400).json({ message: 'View name and layout are required' });
    }

    try {
        const newView = await DashboardView.create({
            name,
            userId: req.user.id,
            widgets: layout.map(item => ({
                widgetKey: item.i,
                x: item.x,
                y: item.y,
                w: item.w,
                h: item.h,
            }))
        }, {
            include: [{ model: DashboardWidget, as: 'widgets' }]
        });

        res.status(201).json(newView);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});


// @desc    Update a dashboard view
// @route   PUT /api/dashboard/views/:id
// @access  Private
router.put('/views/:id', protect, async (req, res) => {
    const { name, layout } = req.body;

    try {
        const view = await DashboardView.findOne({ where: { id: req.params.id, userId: req.user.id } });

        if (!view) {
            return res.status(404).json({ message: 'View not found' });
        }

        // Update view name
        view.name = name || view.name;
        await view.save();

        // Remove old widgets
        await DashboardWidget.destroy({ where: { viewId: view.id } });

        // Add new widgets
        const widgetInstances = layout.map(item => ({
            widgetKey: item.i,
            viewId: view.id,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
        }));
        await DashboardWidget.bulkCreate(widgetInstances);


        res.json({ message: "View updated successfully" });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Delete a dashboard view
// @route   DELETE /api/dashboard/views/:id
// @access  Private
router.delete('/views/:id', protect, async (req, res) => {
    try {
        const view = await DashboardView.findOne({ where: { id: req.params.id, userId: req.user.id } });

        if (!view) {
            return res.status(404).json({ message: 'View not found' });
        }

        await view.destroy();
        res.json({ message: 'View removed' });

    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


module.exports = router;