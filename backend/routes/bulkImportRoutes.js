const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { protect } = require('../middleware/authMiddleware');
const BulkImportService = require('../services/BulkImportService');
const FileProcessingService = require('../services/FileProcessingService');
const JobQueue = require('../services/JobQueue');
const BulkImport = require('../models/BulkImport');
const BulkImportError = require('../models/BulkImportError');
const BulkImportSuccess = require('../models/BulkImportSuccess');
const BulkImportStats = require('../models/BulkImportStats');
const WorkerManager = require('../services/WorkerManager');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/bulk-imports');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `bulk-import-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const extension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`));
    }
  }
});

// Apply authentication middleware to all routes
router.use(protect);

/**
 * POST /api/bulk-import/upload
 * Upload and validate import file
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log(`📤 File uploaded: ${req.file.originalname} by user ${req.user.id}`);

    // Process file to extract preview data
    const fileResult = await FileProcessingService.processFile(
      req.file.path,
      req.file.originalname
    );

    // Generate field mappings
    const fieldMappings = FileProcessingService.generateFieldMappings(fileResult.headers);

    // Get processing statistics
    const stats = FileProcessingService.getProcessingStats(fileResult);

    // Preview data (first 10 rows)
    const previewData = fileResult.contacts.slice(0, 10);

    res.json({
      success: true,
      message: 'File uploaded and validated successfully',
      data: {
        fileInfo: {
          originalName: req.file.originalname,
          fileName: req.file.filename,
          size: req.file.size,
          type: fileResult.type,
          path: req.file.path
        },
        preview: {
          headers: fileResult.headers,
          data: previewData,
          totalRows: fileResult.totalRows
        },
        mappings: {
          suggested: fieldMappings,
          available: [
            'firstName', 'lastName', 'email', 'phone', 'mobile', 'jobTitle',
            'company', 'department', 'address', 'city', 'state', 'zipCode',
            'country', 'notes', 'tags', 'status', 'source'
          ]
        },
        stats: stats,
        errors: fileResult.errors.slice(0, 10) // Show first 10 errors
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up uploaded file:', unlinkError);
      }
    }

    res.status(400).json({
      success: false,
      message: error.message || 'File upload failed'
    });
  }
});

/**
 * POST /api/bulk-import/start
 * Start bulk import process
 */
router.post('/start', async (req, res) => {
  try {
    const {
      fileName,
      originalFileName,
      filePath,
      fileSize,
      fieldMappings = {},
      duplicateHandling = 'skip',
      configuration = {}
    } = req.body;

    // Validate required fields
    if (!fileName || !originalFileName || !filePath) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fileName, originalFileName, filePath'
      });
    }

    // Validate file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Uploaded file not found'
      });
    }

    // Create bulk import record
    const bulkImport = await BulkImportService.createImport({
      fileName,
      originalFileName,
      filePath,
      fileSize,
      userId: req.user.id,
      companyId: req.user.companyId,
      fieldMappings,
      duplicateHandling,
      configuration
    });

    // Add job to queue
    await JobQueue.addJob('bulk_import', {
      bulkImportId: bulkImport.id
    }, 'high');

    // Start worker on-demand to process the job
    const workerStarted = await WorkerManager.triggerProcessing('bulk_import');
    if (!workerStarted) {
      console.warn('⚠️  Worker could not be started, job will remain queued');
    }

    console.log(`🚀 Bulk import started: ${bulkImport.id} (${originalFileName})`);

    res.json({
      success: true,
      message: 'Bulk import started successfully',
      data: {
        importId: bulkImport.id,
        status: bulkImport.status,
        fileName: bulkImport.originalFileName,
        queuePosition: 1 // TODO: Calculate actual queue position
      }
    });

  } catch (error) {
    console.error('Bulk import start error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start bulk import'
    });
  }
});

/**
 * GET /api/bulk-import/:id/progress
 * Get import progress
 */
router.get('/:id/progress', async (req, res) => {
  try {
    const importId = parseInt(req.params.id);
    
    if (!importId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid import ID'
      });
    }

    const progress = await BulkImportService.getImportProgress(importId);

    // Check if user has access to this import
    if (progress.userId !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('Get import progress error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get import progress'
    });
  }
});

/**
 * GET /api/bulk-import/history
 * Get import history for current user/company
 */
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereConditions = {
      companyId: req.user.companyId
    };

    // Filter by user unless admin
    if (req.user.role !== 'Administrator') {
      whereConditions.userId = req.user.id;
    }

    // Filter by status if provided
    if (status) {
      whereConditions.status = status;
    }

    const { count, rows } = await BulkImport.findAndCountAll({
      where: whereConditions,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: require('../models/User'),
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        imports: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get import history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get import history'
    });
  }
});

/**
 * GET /api/bulk-import/:id/results
 * Get detailed import results
 */
router.get('/:id/results', async (req, res) => {
  try {
    const importId = parseInt(req.params.id);
    
    if (!importId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid import ID'
      });
    }

    // Get bulk import record
    const bulkImport = await BulkImport.findByPk(importId, {
      include: [
        {
          model: require('../models/User'),
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!bulkImport) {
      return res.status(404).json({
        success: false,
        message: 'Import not found'
      });
    }

    // Check access
    if (bulkImport.userId !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get success records
    const successes = await BulkImportSuccess.findByImportId(importId, {
      limit: 100,
      include: [
        {
          model: require('../models/Contact'),
          as: 'contact',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }
      ]
    });

    // Get error records
    const errors = await BulkImportError.findByImportId(importId, {
      limit: 100
    });

    // Get statistics
    const stats = await BulkImportStats.findByImportId(importId);

    // Get action summary
    const actionStats = await BulkImportSuccess.getActionStatsByImportId(importId);
    const errorStats = await BulkImportError.getErrorStatsByImportId(importId);

    res.json({
      success: true,
      data: {
        import: bulkImport,
        summary: {
          total: bulkImport.totalRecords,
          processed: bulkImport.processedRecords,
          successful: bulkImport.successfulRecords,
          failed: bulkImport.failedRecords,
          successRate: bulkImport.getSuccessRate(),
          progressPercentage: bulkImport.getProgressPercentage()
        },
        actions: actionStats,
        errors: {
          summary: errorStats,
          records: errors
        },
        successes: successes,
        statistics: stats
      }
    });

  } catch (error) {
    console.error('Get import results error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get import results'
    });
  }
});

/**
 * POST /api/bulk-import/:id/retry
 * Retry failed import
 */
router.post('/:id/retry', async (req, res) => {
  try {
    const importId = parseInt(req.params.id);
    
    if (!importId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid import ID'
      });
    }

    // Get bulk import record
    const bulkImport = await BulkImport.findByPk(importId);

    if (!bulkImport) {
      return res.status(404).json({
        success: false,
        message: 'Import not found'
      });
    }

    // Check access
    if (bulkImport.userId !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Retry import
    const retryImport = await BulkImportService.retryImport(importId);

    // Add job to queue
    await JobQueue.addJob('bulk_import', {
      bulkImportId: retryImport.id
    }, 'high');

    // Start worker on-demand to process the retry
    const workerStarted = await WorkerManager.triggerProcessing('bulk_import');
    if (!workerStarted) {
      console.warn('⚠️  Worker could not be started, retry will remain queued');
    }

    res.json({
      success: true,
      message: 'Import queued for retry',
      data: {
        importId: retryImport.id,
        status: retryImport.status
      }
    });

  } catch (error) {
    console.error('Retry import error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retry import'
    });
  }
});

/**
 * DELETE /api/bulk-import/:id
 * Delete import and associated data
 */
router.delete('/:id', async (req, res) => {
  try {
    const importId = parseInt(req.params.id);
    
    if (!importId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid import ID'
      });
    }

    // Get bulk import record
    const bulkImport = await BulkImport.findByPk(importId);

    if (!bulkImport) {
      return res.status(404).json({
        success: false,
        message: 'Import not found'
      });
    }

    // Check access
    if (bulkImport.userId !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Cannot delete if processing
    if (bulkImport.isInProgress()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete import while processing'
      });
    }

    // Delete associated records and files
    await BulkImportError.destroy({ where: { bulkImportId: importId } });
    await BulkImportSuccess.destroy({ where: { bulkImportId: importId } });
    await BulkImportStats.destroy({ where: { bulkImportId: importId } });

    // Delete uploaded file
    try {
      if (bulkImport.filePath) {
        await fs.unlink(bulkImport.filePath);
      }
    } catch (fileError) {
      console.warn('Could not delete uploaded file:', fileError.message);
    }

    // Delete import record
    await bulkImport.destroy();

    res.json({
      success: true,
      message: 'Import deleted successfully'
    });

  } catch (error) {
    console.error('Delete import error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete import'
    });
  }
});

/**
 * GET /api/bulk-import/queue/status
 * Get queue status and statistics
 */
router.get('/queue/status', async (req, res) => {
  try {
    // Only administrators can view queue status
    if (req.user.role !== 'Administrator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const queueStats = await JobQueue.getQueueStats();
    const recentJobs = await JobQueue.getJobsByStatus('processing', 5);
    const failedJobs = await JobQueue.getJobsByStatus('failed', 5);

    // Get worker status from WorkerManager
    const workerStatus = WorkerManager.getWorkerStatus();

    res.json({
      success: true,
      data: {
        queue: queueStats,
        recent: recentJobs,
        failed: failedJobs,
        worker: workerStatus
      }
    });

  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get queue status'
    });
  }
});

/**
 * POST /api/bulk-import/queue/process
 * Process all pending jobs (admin only)
 */
router.post('/queue/process', async (req, res) => {
  try {
    // Start worker on-demand to process all pending jobs
    const workerStarted = await WorkerManager.triggerProcessing('bulk_import');
    if (!workerStarted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to start worker for processing'
      });
    }

    // Get current queue stats
    const queueStats = await JobQueue.getQueueStats();

    res.json({
      success: true,
      message: `Worker started to process ${queueStats.pending} pending jobs`,
      data: {
        pendingJobs: queueStats.pending,
        workerStarted: true
      }
    });

  } catch (error) {
    console.error('Process queue error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process queue'
    });
  }
});

/**
 * GET /api/bulk-import/statistics
 * Get bulk import statistics for company
 */
router.get('/statistics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const whereConditions = {
      companyId: req.user.companyId,
      created_at: {
        [require('sequelize').Op.between]: [startDate, endDate]
      }
    };

    // Filter by user unless admin
    if (req.user.role !== 'Administrator') {
      whereConditions.userId = req.user.id;
    }

    // Get import statistics
    const stats = await BulkImport.findAll({
      where: whereConditions,
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
        [require('sequelize').fn('SUM', require('sequelize').col('total_records')), 'totalRows'],
        [require('sequelize').fn('SUM', require('sequelize').col('successful_records')), 'successfulRows'],
        [require('sequelize').fn('SUM', require('sequelize').col('failed_records')), 'errorRows']
      ],
      group: ['status']
    });

    res.json({
      success: true,
      data: {
        period,
        statistics: stats
      }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get statistics'
    });
  }
});

module.exports = router;