const fs = require('fs').promises;
const path = require('path');

// Widget cache
let widgetCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Widget storage directory
const WIDGETS_DIR = path.join(__dirname, '..', 'widgets');

/**
 * Get widget manifest (list of all available widgets)
 * @param {boolean} forceRefresh - Force refresh the cache
 * @returns {Promise<Array>} Array of widget manifests
 */
async function getWidgetManifest(forceRefresh = false) {
    const now = Date.now();
    
    // Return cached data if still valid and not forcing refresh
    if (!forceRefresh && widgetCache && (now - lastCacheTime) < CACHE_DURATION) {
        return widgetCache;
    }
    
    try {
        const widgets = [];
        
        // Read all directories in widgets folder
        const typeDirs = await fs.readdir(WIDGETS_DIR);
        
        for (const typeDir of typeDirs) {
            const typePath = path.join(WIDGETS_DIR, typeDir);
            const typeStat = await fs.stat(typePath);
            
            if (typeStat.isDirectory()) {
                const widgetDirs = await fs.readdir(typePath);
                
                for (const widgetDir of widgetDirs) {
                    const widgetPath = path.join(typePath, widgetDir);
                    const widgetStat = await fs.stat(widgetPath);
                    
                    if (widgetStat.isDirectory()) {
                        try {
                            // Try to read widget.json
                            const manifestPath = path.join(widgetPath, 'widget.json');
                            const manifestContent = await fs.readFile(manifestPath, 'utf8');
                            const manifest = JSON.parse(manifestContent);
                            
                            // Add type and directory info
                            manifest.type = typeDir;
                            manifest.directory = widgetDir;
                            
                            widgets.push(manifest);
                        } catch (error) {
                            console.warn(`Failed to read manifest for widget ${typeDir}/${widgetDir}:`, error.message);
                        }
                    }
                }
            }
        }
        
        // Update cache
        widgetCache = widgets;
        lastCacheTime = now;
        
        return widgets;
    } catch (error) {
        console.error('Error reading widget manifest:', error);
        throw new Error('Failed to read widget manifest');
    }
}

/**
 * Get widget file content
 * @param {string} type - Widget type (e.g., 'buildin', 'custom')
 * @param {string} directory - Widget directory name
 * @param {string} filename - File name to retrieve
 * @returns {Promise<Object>} Object with content and mimeType
 */
async function getWidgetFile(type, directory, filename) {
    try {
        const filePath = path.join(WIDGETS_DIR, type, directory, filename);
        
        // Check if file exists
        await fs.access(filePath);
        
        // Determine MIME type based on file extension
        const ext = path.extname(filename).toLowerCase();
        let mimeType = 'text/plain';
        
        switch (ext) {
            case '.js':
            case '.jsx':
                mimeType = 'application/javascript';
                break;
            case '.html':
                mimeType = 'text/html';
                break;
            case '.css':
                mimeType = 'text/css';
                break;
            case '.json':
                mimeType = 'application/json';
                break;
            case '.png':
                mimeType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                mimeType = 'image/jpeg';
                break;
            case '.gif':
                mimeType = 'image/gif';
                break;
            case '.svg':
                mimeType = 'image/svg+xml';
                break;
        }
        
        // Read file content
        const content = await fs.readFile(filePath);
        
        // Return as string for text files, buffer for binary files
        if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/javascript') {
            return {
                content: content.toString('utf8'),
                mimeType
            };
        } else {
            return {
                content: content,
                mimeType
            };
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error('Widget file not found');
        }
        console.error('Error reading widget file:', error);
        throw new Error('Failed to read widget file');
    }
}

/**
 * Upload new widget
 * @param {Object} widgetData - Widget metadata
 * @param {Array} files - Uploaded files
 * @returns {Promise<Object>} Widget manifest
 */
async function uploadWidget(widgetData, files) {
    try {
        const { key, name, description, version, author, entry } = widgetData;
        
        if (!key || !name || !entry) {
            throw new Error('Missing required widget data: key, name, and entry are required');
        }
        
        // Create widget directory
        const widgetDir = path.join(WIDGETS_DIR, 'custom', key);
        await fs.mkdir(widgetDir, { recursive: true });
        
        // Create manifest
        const manifest = {
            key,
            name,
            description: description || '',
            version: version || '1.0.0',
            author: author || 'Unknown',
            entry,
            type: 'custom',
            directory: key,
            createdAt: new Date().toISOString()
        };
        
        // Save manifest
        await fs.writeFile(
            path.join(widgetDir, 'widget.json'),
            JSON.stringify(manifest, null, 2)
        );
        
        // Save uploaded files
        for (const file of files) {
            const filePath = path.join(widgetDir, file.originalname);
            await fs.writeFile(filePath, file.buffer);
        }
        
        // Clear cache to force refresh
        widgetCache = null;
        
        return manifest;
    } catch (error) {
        console.error('Error uploading widget:', error);
        throw new Error(`Failed to upload widget: ${error.message}`);
    }
}

/**
 * Delete widget
 * @param {string} key - Widget key
 * @param {string} type - Widget type
 * @returns {Promise<void>}
 */
async function deleteWidget(key, type) {
    try {
        const widgetDir = path.join(WIDGETS_DIR, type, key);
        
        // Check if widget exists
        await fs.access(widgetDir);
        
        // Remove widget directory recursively
        await fs.rm(widgetDir, { recursive: true, force: true });
        
        // Clear cache to force refresh
        widgetCache = null;
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error('Widget not found');
        }
        console.error('Error deleting widget:', error);
        throw new Error(`Failed to delete widget: ${error.message}`);
    }
}

module.exports = {
    getWidgetManifest,
    getWidgetFile,
    uploadWidget,
    deleteWidget
};
