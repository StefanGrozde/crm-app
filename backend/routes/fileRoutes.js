const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const FileAttachment = require('../models/FileAttachment');
const authMiddleware = require('../middleware/authMiddleware');
const { fileUpload, handleUploadError } = require('../middleware/fileUploadMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Upload files for a specific entity
router.post('/upload/:entityType/:entityId', 
  fileUpload.array('files', 10), // Allow up to 10 files
  handleUploadError,
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { description, tags, isPublic } = req.body;
      const userId = req.user.id;
      const companyId = req.user.companyId;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      // Validate entity type
      const allowedEntityTypes = ['sale', 'lead', 'contact', 'opportunity', 'task', 'company', 'user'];
      if (!allowedEntityTypes.includes(entityType)) {
        return res.status(400).json({ error: 'Invalid entity type' });
      }

      const uploadedFiles = [];

      // Process each uploaded file
      for (const file of req.files) {
        const fileAttachment = await FileAttachment.create({
          originalName: file.originalname,
          storedName: file.filename,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileExtension: path.extname(file.originalname),
          entityType,
          entityId: parseInt(entityId),
          description: description || null,
          tags: tags ? JSON.parse(tags) : [],
          companyId,
          uploadedBy: userId,
          isPublic: isPublic === 'true'
        });

        uploadedFiles.push({
          id: fileAttachment.id,
          originalName: fileAttachment.originalName,
          fileSize: fileAttachment.fileSize,
          mimeType: fileAttachment.mimeType,
          url: fileAttachment.getFileUrl()
        });
      }

      res.status(201).json({
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        files: uploadedFiles
      });

    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  }
);

// Get files for a specific entity
router.get('/entity/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const companyId = req.user.companyId;

    const files = await FileAttachment.findAll({
      where: {
        entityType,
        entityId: parseInt(entityId),
        companyId
      },
      order: [['createdAt', 'DESC']]
    });

    const filesWithUrls = files.map(file => ({
      id: file.id,
      originalName: file.originalName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      fileExtension: file.fileExtension,
      description: file.description,
      tags: file.tags,
      isPublic: file.isPublic,
      createdAt: file.createdAt,
      uploadedBy: file.uploadedBy,
      url: file.getFileUrl(),
      isImage: file.isImage(),
      isPdf: file.isPdf(),
      isDocument: file.isDocument()
    }));

    res.json(filesWithUrls);

  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Download a specific file
router.get('/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const companyId = req.user.companyId;

    const file = await FileAttachment.findOne({
      where: {
        id: fileId,
        companyId
      }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.fileSize);

    // Stream the file
    const fileStream = fs.createReadStream(file.filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Update file metadata
router.put('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { description, tags, isPublic } = req.body;
    const companyId = req.user.companyId;

    const file = await FileAttachment.findOne({
      where: {
        id: fileId,
        companyId
      }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    await file.update({
      description: description !== undefined ? description : file.description,
      tags: tags !== undefined ? tags : file.tags,
      isPublic: isPublic !== undefined ? isPublic : file.isPublic
    });

    res.json({
      message: 'File updated successfully',
      file: {
        id: file.id,
        originalName: file.originalName,
        description: file.description,
        tags: file.tags,
        isPublic: file.isPublic
      }
    });

  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// Delete a file
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const companyId = req.user.companyId;

    const file = await FileAttachment.findOne({
      where: {
        id: fileId,
        companyId
      }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete file from disk
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    // Delete file record from database
    await file.destroy();

    res.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Search files across all entities
router.get('/search', async (req, res) => {
  try {
    const { query, entityType, mimeType, limit = 50 } = req.query;
    const companyId = req.user.companyId;

    const whereClause = { companyId };

    if (entityType) {
      whereClause.entityType = entityType;
    }

    if (mimeType) {
      whereClause.mimeType = mimeType;
    }

    let files;
    if (query) {
      // Use full-text search for file names and descriptions
      files = await FileAttachment.findAll({
        where: {
          ...whereClause,
          [require('sequelize').Op.or]: [
            { originalName: { [require('sequelize').Op.iLike]: `%${query}%` } },
            { description: { [require('sequelize').Op.iLike]: `%${query}%` } }
          ]
        },
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']]
      });
    } else {
      files = await FileAttachment.findAll({
        where: whereClause,
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']]
      });
    }

    const filesWithUrls = files.map(file => ({
      id: file.id,
      originalName: file.originalName,
      entityType: file.entityType,
      entityId: file.entityId,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      description: file.description,
      tags: file.tags,
      createdAt: file.createdAt,
      url: file.getFileUrl(),
      isImage: file.isImage(),
      isPdf: file.isPdf(),
      isDocument: file.isDocument()
    }));

    res.json(filesWithUrls);

  } catch (error) {
    console.error('Error searching files:', error);
    res.status(500).json({ error: 'Failed to search files' });
  }
});

module.exports = router;