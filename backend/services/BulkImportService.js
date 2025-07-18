const BulkImport = require('../models/BulkImport');
const BulkImportError = require('../models/BulkImportError');
const BulkImportSuccess = require('../models/BulkImportSuccess');
const BulkImportStats = require('../models/BulkImportStats');
const Contact = require('../models/Contact');
const Company = require('../models/Company');
const User = require('../models/User');
const FileProcessingService = require('./FileProcessingService');
const NotificationService = require('./NotificationService');
const { sequelize } = require('../config/db');

class BulkImportService {
  static BATCH_SIZE = 100;
  static MAX_DUPLICATE_THRESHOLD = 0.8; // 80% similarity threshold

  /**
   * Determine file type from filename
   * @param {string} filename - File name
   * @returns {string} File type
   */
  static getFileTypeFromName(filename) {
    const extension = filename.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'csv':
        return 'csv';
      case 'xlsx':
      case 'xls':
        return 'xlsx';
      case 'json':
        return 'json';
      default:
        return 'csv'; // Default fallback
    }
  }

  /**
   * Create a new bulk import record
   * @param {Object} importData - Import configuration
   * @returns {Promise<BulkImport>} Created bulk import record
   */
  static async createImport(importData) {
    try {
      // Determine file type from filename
      const fileType = this.getFileTypeFromName(importData.originalFileName || importData.fileName);
      
      const bulkImport = await BulkImport.create({
        fileName: importData.originalFileName || importData.fileName, // Use original filename as the display name
        filePath: importData.filePath,
        fileSize: importData.fileSize,
        fileType: fileType,
        userId: importData.userId,
        companyId: importData.companyId,
        status: 'pending',
        totalRecords: importData.totalRows || 0,
        importSettings: importData.configuration || {},
        duplicateHandling: importData.duplicateHandling || 'skip'
      });

      console.log(`📋 Bulk import created: ${bulkImport.id} (${importData.fileName})`);
      return bulkImport;
    } catch (error) {
      console.error('Error creating bulk import:', error);
      throw error;
    }
  }

  /**
   * Process a bulk import
   * @param {number} bulkImportId - Bulk import ID to process
   * @returns {Promise<void>}
   */
  static async processImport(bulkImportId) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🔄 Starting bulk import processing: ${bulkImportId}`);
      
      // Get bulk import record
      const bulkImport = await BulkImport.findByPk(bulkImportId, {
        transaction
      });

      if (!bulkImport) {
        throw new Error(`Bulk import not found: ${bulkImportId}`);
      }

      // Update status to processing
      await bulkImport.update({ 
        status: 'processing',
        processedAt: new Date()
      }, { transaction });

      // Process the file
      const fileResult = await FileProcessingService.processFile(
        bulkImport.filePath,
        bulkImport.fileName
      );

      // Update total rows
      await bulkImport.update({
        totalRows: fileResult.totalRows
      }, { transaction });

      // Process contacts in batches
      const batchResults = await this.processContactsBatches(
        bulkImport,
        fileResult.contacts,
        transaction
      );

      // Calculate final statistics
      const finalStats = this.calculateFinalStats(batchResults);

      // Update bulk import with results
      await bulkImport.update({
        status: finalStats.hasErrors ? 'completed_with_errors' : 'completed',
        processedRows: finalStats.processedRows,
        successfulRows: finalStats.successfulRows,
        errorRows: finalStats.errorRows,
        completedAt: new Date(),
        processingTimeMs: Date.now() - new Date(bulkImport.processedAt).getTime()
      }, { transaction });

      // Create overall statistics
      await this.createOverallStats(bulkImport.id, fileResult, batchResults, transaction);

      // Commit transaction
      await transaction.commit();

      console.log(`✅ Bulk import completed: ${bulkImportId} (${finalStats.successfulRows}/${finalStats.processedRows} successful)`);

      // Send completion notification
      await this.sendCompletionNotification(bulkImport, finalStats);

    } catch (error) {
      await transaction.rollback();
      
      console.error(`❌ Bulk import failed: ${bulkImportId}`, error);
      
      // Update status to failed
      try {
        await BulkImport.update({
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date()
        }, {
          where: { id: bulkImportId }
        });
      } catch (updateError) {
        console.error('Error updating failed status:', updateError);
      }

      throw error;
    }
  }

  /**
   * Process contacts in batches
   * @param {BulkImport} bulkImport - Bulk import record
   * @param {Array} contacts - Array of contact data
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<Object>} Batch processing results
   */
  static async processContactsBatches(bulkImport, contacts, transaction) {
    const results = {
      totalProcessed: 0,
      totalSuccessful: 0,
      totalErrors: 0,
      actions: {
        created: 0,
        updated: 0,
        merged: 0,
        skipped: 0
      },
      fieldStats: new Map(),
      errors: []
    };

    // Process in batches
    for (let i = 0; i < contacts.length; i += this.BATCH_SIZE) {
      const batch = contacts.slice(i, i + this.BATCH_SIZE);
      
      console.log(`📦 Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(contacts.length / this.BATCH_SIZE)} (${batch.length} contacts)`);
      
      const batchResult = await this.processBatch(bulkImport, batch, transaction);
      
      // Accumulate results
      results.totalProcessed += batchResult.processed;
      results.totalSuccessful += batchResult.successful;
      results.totalErrors += batchResult.errors.length;
      
      // Accumulate actions
      for (const [action, count] of Object.entries(batchResult.actions)) {
        results.actions[action] += count;
      }
      
      // Accumulate field stats
      for (const [field, stats] of batchResult.fieldStats) {
        if (!results.fieldStats.has(field)) {
          results.fieldStats.set(field, { 
            total: 0, valid: 0, invalid: 0, empty: 0, 
            unique: new Set(), duplicates: 0, errors: [] 
          });
        }
        
        const fieldResult = results.fieldStats.get(field);
        fieldResult.total += stats.total;
        fieldResult.valid += stats.valid;
        fieldResult.invalid += stats.invalid;
        fieldResult.empty += stats.empty;
        
        stats.unique.forEach(value => fieldResult.unique.add(value));
        fieldResult.duplicates += stats.duplicates;
        fieldResult.errors.push(...stats.errors);
      }
      
      results.errors.push(...batchResult.errors);
      
      // Update progress
      const progressPercentage = Math.round(((i + batch.length) / contacts.length) * 100);
      await bulkImport.update({
        processedRows: i + batch.length,
        progressPercentage
      }, { transaction });
    }

    return results;
  }

  /**
   * Process a single batch of contacts
   * @param {BulkImport} bulkImport - Bulk import record
   * @param {Array} batch - Batch of contacts to process
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<Object>} Batch processing result
   */
  static async processBatch(bulkImport, batch, transaction) {
    const result = {
      processed: 0,
      successful: 0,
      errors: [],
      actions: {
        created: 0,
        updated: 0,
        merged: 0,
        skipped: 0
      },
      fieldStats: new Map()
    };

    const successes = [];
    const errors = [];

    for (const contactData of batch) {
      result.processed++;
      
      try {
        // Validate contact data
        const validation = FileProcessingService.validateContactData(contactData);
        
        if (!validation.isValid) {
          // Record validation errors
          for (const error of validation.errors) {
            errors.push({
              bulkImportId: bulkImport.id,
              rowNumber: contactData.rowNumber,
              errorType: 'validation',
              errorMessage: error,
              rowData: contactData.originalData
            });
          }
          continue;
        }

        // Process contact
        const processResult = await this.processContact(contactData, bulkImport, transaction);
        
        if (processResult.success) {
          result.successful++;
          result.actions[processResult.action]++;
          
          successes.push({
            bulkImportId: bulkImport.id,
            contactId: processResult.contactId,
            rowNumber: contactData.rowNumber,
            actionTaken: processResult.action
          });
        } else {
          errors.push({
            bulkImportId: bulkImport.id,
            rowNumber: contactData.rowNumber,
            errorType: processResult.errorType || 'unknown',
            errorMessage: processResult.error,
            rowData: contactData.originalData
          });
        }

        // Collect field statistics
        this.updateFieldStats(result.fieldStats, contactData, validation);

      } catch (error) {
        console.error(`Error processing contact at row ${contactData.rowNumber}:`, error);
        
        errors.push({
          bulkImportId: bulkImport.id,
          rowNumber: contactData.rowNumber,
          errorType: 'system',
          errorMessage: error.message,
          rowData: contactData.originalData
        });
      }
    }

    // Bulk insert successes and errors
    if (successes.length > 0) {
      await BulkImportSuccess.bulkCreate(successes, { transaction });
    }
    
    if (errors.length > 0) {
      await BulkImportError.bulkCreate(errors, { transaction });
    }

    result.errors = errors;
    return result;
  }

  /**
   * Process individual contact
   * @param {Object} contactData - Contact data to process
   * @param {BulkImport} bulkImport - Bulk import record
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<Object>} Processing result
   */
  static async processContact(contactData, bulkImport, transaction) {
    try {
      // Prepare contact data for database
      const dbContactData = {
        firstName: contactData.firstName || null,
        lastName: contactData.lastName || null,
        email: contactData.email || null,
        phone: contactData.phone || null,
        mobile: contactData.mobile || null,
        jobTitle: contactData.jobTitle || null,
        department: contactData.department || null,
        address: contactData.address || null,
        city: contactData.city || null,
        state: contactData.state || null,
        zipCode: contactData.zipCode || null,
        country: contactData.country || null,
        notes: contactData.notes || null,
        tags: contactData.tags || null,
        status: contactData.status || 'active',
        source: contactData.source || 'bulk_import',
        companyId: bulkImport.companyId,
        createdBy: bulkImport.userId,
        assignedTo: bulkImport.userId
      };

      // Check for existing contact
      const existingContact = await this.findExistingContact(dbContactData, transaction);
      
      if (existingContact) {
        return await this.handleExistingContact(existingContact, dbContactData, bulkImport, transaction);
      } else {
        return await this.createNewContact(dbContactData, transaction);
      }

    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorType: 'system'
      };
    }
  }

  /**
   * Find existing contact based on email or name
   * @param {Object} contactData - Contact data
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<Contact|null>} Existing contact or null
   */
  static async findExistingContact(contactData, transaction) {
    const whereConditions = [];
    
    // Search by email (primary match)
    if (contactData.email) {
      whereConditions.push({
        email: contactData.email,
        companyId: contactData.companyId
      });
    }
    
    // Search by name (secondary match)
    if (contactData.firstName && contactData.lastName) {
      whereConditions.push({
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        companyId: contactData.companyId
      });
    }
    
    if (whereConditions.length === 0) {
      return null;
    }

    return await Contact.findOne({
      where: {
        [sequelize.Op.or]: whereConditions
      },
      transaction
    });
  }

  /**
   * Handle existing contact based on duplicate handling strategy
   * @param {Contact} existingContact - Existing contact record
   * @param {Object} newContactData - New contact data
   * @param {BulkImport} bulkImport - Bulk import record
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<Object>} Processing result
   */
  static async handleExistingContact(existingContact, newContactData, bulkImport, transaction) {
    const duplicateHandling = bulkImport.duplicateHandling;
    
    switch (duplicateHandling) {
      case 'skip':
        return {
          success: true,
          action: 'skipped_duplicate',
          contactId: existingContact.id
        };
        
      case 'update':
        // Update existing contact with new data
        const updateData = {};
        
        // Only update fields that have new values
        for (const [key, value] of Object.entries(newContactData)) {
          if (value !== null && value !== undefined && value !== '' && 
              key !== 'id' && key !== 'companyId' && key !== 'createdBy') {
            updateData[key] = value;
          }
        }
        
        await existingContact.update(updateData, { transaction });
        
        return {
          success: true,
          action: 'updated',
          contactId: existingContact.id
        };
        
      case 'merge':
        // Merge data, keeping existing values unless new ones are better
        const mergeData = { ...existingContact.dataValues };
        
        for (const [key, value] of Object.entries(newContactData)) {
          if (value !== null && value !== undefined && value !== '' && 
              key !== 'id' && key !== 'companyId' && key !== 'createdBy') {
            // Use new value if existing is empty or new value is longer/better
            if (!mergeData[key] || 
                (typeof value === 'string' && value.length > (mergeData[key] || '').length)) {
              mergeData[key] = value;
            }
          }
        }
        
        await existingContact.update(mergeData, { transaction });
        
        return {
          success: true,
          action: 'merged',
          contactId: existingContact.id
        };
        
      default:
        return {
          success: false,
          error: `Unknown duplicate handling strategy: ${duplicateHandling}`,
          errorType: 'configuration'
        };
    }
  }

  /**
   * Create new contact
   * @param {Object} contactData - Contact data
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<Object>} Processing result
   */
  static async createNewContact(contactData, transaction) {
    try {
      const newContact = await Contact.create(contactData, { transaction });
      
      return {
        success: true,
        action: 'created',
        contactId: newContact.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorType: 'database'
      };
    }
  }

  /**
   * Update field statistics
   * @param {Map} fieldStats - Field statistics map
   * @param {Object} contactData - Contact data
   * @param {Object} validation - Validation result
   */
  static updateFieldStats(fieldStats, contactData, validation) {
    const fields = [
      'firstName', 'lastName', 'email', 'phone', 'mobile', 'jobTitle',
      'department', 'address', 'city', 'state', 'zipCode', 'country',
      'notes', 'tags', 'status', 'source'
    ];

    for (const field of fields) {
      if (!fieldStats.has(field)) {
        fieldStats.set(field, {
          total: 0,
          valid: 0,
          invalid: 0,
          empty: 0,
          unique: new Set(),
          duplicates: 0,
          errors: []
        });
      }

      const stats = fieldStats.get(field);
      const value = contactData[field];

      stats.total++;

      if (value === null || value === undefined || value === '') {
        stats.empty++;
      } else {
        // Check if value was in unique set (duplicate)
        if (stats.unique.has(value)) {
          stats.duplicates++;
        } else {
          stats.unique.add(value);
        }

        // Check validation
        const fieldErrors = validation.errors.filter(error => 
          error.toLowerCase().includes(field.toLowerCase())
        );

        if (fieldErrors.length > 0) {
          stats.invalid++;
          stats.errors.push(...fieldErrors);
        } else {
          stats.valid++;
        }
      }
    }
  }

  /**
   * Calculate final statistics
   * @param {Object} batchResults - Batch processing results
   * @returns {Object} Final statistics
   */
  static calculateFinalStats(batchResults) {
    return {
      processedRows: batchResults.totalProcessed,
      successfulRows: batchResults.totalSuccessful,
      errorRows: batchResults.totalErrors,
      hasErrors: batchResults.totalErrors > 0,
      actions: batchResults.actions,
      successRate: batchResults.totalProcessed > 0 ? 
        Math.round((batchResults.totalSuccessful / batchResults.totalProcessed) * 100) : 0
    };
  }

  /**
   * Create overall statistics records
   * @param {number} bulkImportId - Bulk import ID
   * @param {Object} fileResult - File processing result
   * @param {Object} batchResults - Batch processing results
   * @param {Transaction} transaction - Database transaction
   */
  static async createOverallStats(bulkImportId, fileResult, batchResults, transaction) {
    const statsToCreate = [];

    for (const [fieldName, stats] of batchResults.fieldStats) {
      statsToCreate.push({
        bulkImportId,
        fieldName,
        totalValues: stats.total,
        validValues: stats.valid,
        invalidValues: stats.invalid,
        emptyValues: stats.empty,
        uniqueValues: stats.unique.size,
        duplicateValues: stats.duplicates,
        commonErrors: stats.errors.slice(0, 10).map(error => ({ 
          type: 'validation', 
          message: error, 
          count: 1 
        }))
      });
    }

    if (statsToCreate.length > 0) {
      await BulkImportStats.bulkCreate(statsToCreate, { transaction });
    }
  }

  /**
   * Send completion notification
   * @param {BulkImport} bulkImport - Bulk import record
   * @param {Object} stats - Final statistics
   */
  static async sendCompletionNotification(bulkImport, stats) {
    try {
      const notificationData = {
        userId: bulkImport.userId,
        type: 'bulk_import_completed',
        title: 'Bulk Import Completed',
        message: `Import "${bulkImport.fileName}" processed ${stats.successfulRows}/${stats.processedRows} contacts successfully`,
        data: {
          bulkImportId: bulkImport.id,
          fileName: bulkImport.fileName,
          stats: stats
        },
        actionUrl: `/contacts?import=${bulkImport.id}`
      };

      await NotificationService.createNotification(notificationData);
      
      console.log(`📧 Completion notification sent for import ${bulkImport.id}`);
    } catch (error) {
      console.error('Error sending completion notification:', error);
    }
  }

  /**
   * Get import progress
   * @param {number} bulkImportId - Bulk import ID
   * @returns {Promise<Object>} Progress information
   */
  static async getImportProgress(bulkImportId) {
    try {
      const bulkImport = await BulkImport.findByPk(bulkImportId);
      
      if (!bulkImport) {
        throw new Error('Bulk import not found');
      }

      return {
        id: bulkImport.id,
        status: bulkImport.status,
        fileName: bulkImport.fileName,
        totalRows: bulkImport.totalRows,
        processedRows: bulkImport.processedRows,
        successfulRows: bulkImport.successfulRows,
        errorRows: bulkImport.errorRows,
        progressPercentage: bulkImport.getProgressPercentage(),
        isInProgress: bulkImport.isInProgress(),
        canRetry: bulkImport.canRetry(),
        createdAt: bulkImport.createdAt,
        processedAt: bulkImport.processedAt,
        completedAt: bulkImport.completedAt
      };
    } catch (error) {
      console.error('Error getting import progress:', error);
      throw error;
    }
  }

  /**
   * Retry failed import
   * @param {number} bulkImportId - Bulk import ID
   * @returns {Promise<BulkImport>} Updated bulk import record
   */
  static async retryImport(bulkImportId) {
    try {
      const bulkImport = await BulkImport.findByPk(bulkImportId);
      
      if (!bulkImport) {
        throw new Error('Bulk import not found');
      }

      if (!bulkImport.canRetry()) {
        throw new Error('Import cannot be retried');
      }

      // Reset import status
      await bulkImport.update({
        status: 'pending',
        processedRows: 0,
        successfulRows: 0,
        errorRows: 0,
        progressPercentage: 0,
        processedAt: null,
        completedAt: null,
        errorMessage: null
      });

      console.log(`🔄 Import queued for retry: ${bulkImportId}`);
      return bulkImport;
    } catch (error) {
      console.error('Error retrying import:', error);
      throw error;
    }
  }
}

module.exports = BulkImportService;