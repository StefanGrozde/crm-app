const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { DashboardView, DashboardWidget } = require('../models/DashboardView');

const router = express.Router();

// Get all views for the authenticated user
router.get('/views', authenticate, async (req, res) => {
    try {
        const views = await DashboardView.findAll({
            where: { userId: req.user.id },
            include: [{ model: DashboardWidget, as: 'widgets' }],
            order: [['isDefault', 'DESC'], ['createdAt', 'ASC']] // Default views first, then by creation date
        });
        
        res.json(views);
    } catch (error) {
        console.error('Error fetching dashboard views:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard views' });
    }
});

// Get a specific view by ID
router.get('/views/:id', authenticate, async (req, res) => {
    try {
        const view = await DashboardView.findOne({
            where: { 
                id: req.params.id,
                userId: req.user.id 
            },
            include: [{ model: DashboardWidget, as: 'widgets' }]
        });
        
        if (!view) {
            return res.status(404).json({ error: 'Dashboard view not found' });
        }
        
        res.json(view);
    } catch (error) {
        console.error('Error fetching dashboard view:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard view' });
    }
});

// Create a new view
router.post('/views', authenticate, async (req, res) => {
    try {
        const { name, widgets = [], isDefault = false } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'View name is required' });
        }
        
        // Create the view
        const view = await DashboardView.create({
            name: name.trim(),
            userId: req.user.id,
            isDefault: isDefault
        });
        
        // Add widgets if provided
        if (widgets && widgets.length > 0) {
            const widgetData = widgets.map(w => ({
                widgetKey: w.widgetKey,
                x: w.x || 0,
                y: w.y || 0,
                w: w.w || 6,
                h: w.h || 2,
                viewId: view.id
            }));
            
            await DashboardWidget.bulkCreate(widgetData);
        }
        
        // Fetch the complete view with widgets
        const completeView = await DashboardView.findOne({
            where: { id: view.id },
            include: [{ model: DashboardWidget, as: 'widgets' }]
        });
        
        res.status(201).json(completeView);
    } catch (error) {
        console.error('Error creating dashboard view:', error);
        res.status(500).json({ error: 'Failed to create dashboard view' });
    }
});

// Update a view
router.put('/views/:id', authenticate, async (req, res) => {
    try {
        const { name, widgets = [], isDefault } = req.body;
        
        // Find the view
        const view = await DashboardView.findOne({
            where: { 
                id: req.params.id,
                userId: req.user.id 
            }
        });
        
        if (!view) {
            return res.status(404).json({ error: 'Dashboard view not found' });
        }
        
        // Update view properties
        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (isDefault !== undefined) updateData.isDefault = isDefault;
        
        if (Object.keys(updateData).length > 0) {
            await view.update(updateData);
        }
        
        // Update widgets if provided
        if (widgets) {
            // Delete existing widgets
            await DashboardWidget.destroy({
                where: { viewId: view.id }
            });
            
            // Add new widgets
            if (widgets.length > 0) {
                const widgetData = widgets.map(w => ({
                    widgetKey: w.widgetKey,
                    x: w.x || 0,
                    y: w.y || 0,
                    w: w.w || 6,
                    h: w.h || 2,
                    viewId: view.id
                }));
                
                await DashboardWidget.bulkCreate(widgetData);
            }
        }
        
        // Fetch the complete updated view
        const updatedView = await DashboardView.findOne({
            where: { id: view.id },
            include: [{ model: DashboardWidget, as: 'widgets' }]
        });
        
        res.json(updatedView);
    } catch (error) {
        console.error('Error updating dashboard view:', error);
        res.status(500).json({ error: 'Failed to update dashboard view' });
    }
});

// Delete a view
router.delete('/views/:id', authenticate, async (req, res) => {
    try {
        const view = await DashboardView.findOne({
            where: { 
                id: req.params.id,
                userId: req.user.id 
            }
        });
        
        if (!view) {
            return res.status(404).json({ error: 'Dashboard view not found' });
        }
        
        await view.destroy();
        
        res.json({ message: 'Dashboard view deleted successfully' });
    } catch (error) {
        console.error('Error deleting dashboard view:', error);
        res.status(500).json({ error: 'Failed to delete dashboard view' });
    }
});

// Set a view as default
router.post('/views/:id/set-default', authenticate, async (req, res) => {
    try {
        const view = await DashboardView.findOne({
            where: { 
                id: req.params.id,
                userId: req.user.id 
            }
        });
        
        if (!view) {
            return res.status(404).json({ error: 'Dashboard view not found' });
        }
        
        await DashboardView.setDefaultForUser(view.id, req.user.id);
        
        res.json({ message: 'Default view updated successfully' });
    } catch (error) {
        console.error('Error setting default view:', error);
        res.status(500).json({ error: 'Failed to set default view' });
    }
});

// Get default view for user
router.get('/default', authenticate, async (req, res) => {
    try {
        const defaultView = await DashboardView.findDefaultForUser(req.user.id);
        
        if (!defaultView) {
            return res.status(404).json({ error: 'No default view found' });
        }
        
        res.json(defaultView);
    } catch (error) {
        console.error('Error fetching default view:', error);
        res.status(500).json({ error: 'Failed to fetch default view' });
    }
});

module.exports = router;