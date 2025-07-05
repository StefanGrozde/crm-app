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
    return res.status(400).send('No file uploaded.');
  }
  res.status(201).send({
    message: 'Widget uploaded successfully',
    fileName: req.file.filename,
  });
});


// @desc    Get the combined widget manifest
// @route   GET /api/widgets/manifest
// @access  Private
router.get('/manifest', (req, res) => {
    const builtInWidgetsDir = path.join(__dirname, '..', '..', 'frontend', 'src', 'components', 'widgets');
    const uploadedWidgetsDir = path.join(__dirname, '..', 'widgets');

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
                    // The path will be different for uploaded widgets
                    path: type === 'uploaded' ? `${urlPrefix}/${file}` : `./widgets/${file}`,
                    type: type
                };
            });
    };

    try {
        const builtInWidgets = readWidgetsFromDirectory(builtInWidgetsDir, 'builtin');
        const uploadedWidgets = readWidgetsFromDirectory(uploadedWidgetsDir, 'uploaded', '/api/widgets/files');

        // Combine and return the lists
        res.json([...builtInWidgets, ...uploadedWidgets]);
    } catch (error) {
        console.error('Failed to generate widget manifest:', error);
        res.status(500).json({ message: 'Cannot generate widget manifest' });
    }
});


module.exports = router;