const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const upload = require('../middleware/uploadMiddleware'); // Import the upload middleware

// @desc    Upload a new widget
// @route   POST /api/widgets/upload
// @access  Private (Admin only, assuming you have an authorize middleware)
router.post('/upload', upload.single('widget'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  
  console.log('Widget uploaded:', req.file.filename);
  
  res.status(201).json({
    message: 'Widget uploaded successfully',
    fileName: req.file.filename,
    path: `/api/widgets/uploaded/${req.file.filename}`,
  });
});

// @desc    Get the combined widget manifest
// @route   GET /api/widgets/manifest
// @access  Private
router.get('/manifest', (req, res) => {
    const builtInWidgetsDir = path.join(__dirname, '..', 'widgets', 'builtin');
    const uploadedWidgetsDir = path.join(__dirname, '..', 'widgets', 'uploaded');

    const readWidgetsFromDirectory = (dir, type, urlPrefix = '') => {
        if (!fs.existsSync(dir)) {
            return [];
        }

        return fs.readdirSync(dir)
            .filter(file => file.endsWith('.js'))
            .map(file => {
                const componentName = path.basename(file, '.js');
                const displayName = componentName.replace(/([A-Z])/g, ' $1').replace('Widget', '').trim();

                return {
                    key: componentName,
                    name: displayName,
                    path: `${urlPrefix}/${file}`,
                    type: type
                };
            });
    };

    try {
        const builtInWidgets = readWidgetsFromDirectory(builtInWidgetsDir, 'builtin', '/api/widgets/builtin');
        const uploadedWidgets = readWidgetsFromDirectory(uploadedWidgetsDir, 'uploaded', '/api/widgets/uploaded');

        // Combine and return the lists
        res.json([...builtInWidgets, ...uploadedWidgets]);
    } catch (error) {
        console.error('Failed to generate widget manifest:', error);
        res.status(500).json({ message: 'Cannot generate widget manifest' });
    }
});

// @desc    Serve built-in widgets
// @route   GET /api/widgets/builtin/:filename
// @access  Private
router.get('/builtin/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'widgets', 'builtin', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Widget not found' });
    }
    
    res.sendFile(filePath);
});

// @desc    Serve uploaded widgets
// @route   GET /api/widgets/uploaded/:filename
// @access  Private
router.get('/uploaded/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'widgets', 'uploaded', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Widget not found' });
    }
    
    res.sendFile(filePath);
});

module.exports = router;