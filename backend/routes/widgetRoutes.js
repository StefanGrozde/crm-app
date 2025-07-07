const express = require('express');
const multer = require('multer');
const { protect: authenticate, authorize } = require('../middleware/authMiddleware');
const widgetService = require('../services/widgetService');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 20 // Maximum 20 files per upload
    },
    fileFilter: (req, file, cb) => {
        // Allow common web files
        const allowedTypes = [
            'application/javascript',
            'text/javascript',
            'text/html',
            'text/css',
            'application/json',
            'image/png',
            'image/jpeg',
            'image/gif',
            'image/svg+xml'
        ];
        
        const allowedExtensions = ['.js', '.jsx', '.html', '.css', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg'];
        const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
        
        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only web files are allowed.'));
        }
    }
});

// Get widget manifest (list of all available widgets)
router.get('/manifest', authenticate, async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const widgets = await widgetService.getWidgetManifest(false, includeInactive);
        res.json(widgets);
    } catch (error) {
        console.error('Error fetching widget manifest:', error);
        res.status(500).json({ error: 'Failed to fetch widget manifest' });
    }
});

// Serve widget files with flexible path matching using regex
router.get(/^\/([^\/]+)\/([^\/]+)\/(.+)$/, authenticate, async (req, res) => {
    try {
        const type = req.params[0];
        const directory = req.params[1];
        const filename = req.params[2];
        
        const { content, mimeType } = await widgetService.getWidgetFile(type, directory, filename);
        
        res.set('Content-Type', mimeType);
        res.send(content);
    } catch (error) {
        console.error('Error serving widget file:', error);
        res.status(404).json({ error: error.message });
    }
});

// Upload new widget (Admin only)
router.post('/upload', authenticate, authorize(['Administrator']), upload.array('files'), async (req, res) => {
    try {
        const { key, name, description, version, author, entry } = req.body;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        
        const widgetData = { key, name, description, version, author, entry };
        const manifest = await widgetService.uploadWidget(widgetData, req.files);
        
        res.json({
            success: true,
            message: 'Widget uploaded successfully',
            widget: manifest
        });
    } catch (error) {
        console.error('Error uploading widget:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete widget (Admin only)
router.delete('/:type/:key', authenticate, authorize(['Administrator']), async (req, res) => {
    try {
        const { type, key } = req.params;
        
        await widgetService.deleteWidget(key, type);
        
        res.json({
            success: true,
            message: 'Widget deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting widget:', error);
        res.status(400).json({ error: error.message });
    }
});

// Refresh widget cache (Admin only)
router.post('/refresh', authenticate, authorize(['Administrator']), async (req, res) => {
    try {
        const widgets = await widgetService.getWidgetManifest(true);
        res.json({
            success: true,
            message: 'Widget cache refreshed',
            count: widgets.length
        });
    } catch (error) {
        console.error('Error refreshing widget cache:', error);
        res.status(500).json({ error: 'Failed to refresh widget cache' });
    }
});

// Create or update database widget (Admin only)
router.post('/database', authenticate, authorize(['Administrator']), async (req, res) => {
    try {
        const widgetData = req.body;
        const widget = await widgetService.createOrUpdateWidget(widgetData);
        
        res.json({
            success: true,
            message: 'Widget saved successfully',
            widget
        });
    } catch (error) {
        console.error('Error creating/updating database widget:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete database widget (Admin only)
router.delete('/database/:widgetKey', authenticate, authorize(['Administrator']), async (req, res) => {
    try {
        const { widgetKey } = req.params;
        
        await widgetService.deleteDatabaseWidget(widgetKey);
        
        res.json({
            success: true,
            message: 'Database widget deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting database widget:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get single database widget
router.get('/database/:widgetKey', authenticate, async (req, res) => {
    try {
        const { widgetKey } = req.params;
        const widget = await widgetService.getWidgetByKey(widgetKey);
        
        if (!widget) {
            return res.status(404).json({ error: 'Widget not found' });
        }
        
        res.json(widget);
    } catch (error) {
        console.error('Error getting database widget:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;