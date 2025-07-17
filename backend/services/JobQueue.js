const Job = require('../models/Job');
const BulkImportService = require('./BulkImportService');

class JobQueue {
  /**
   * Add a new job to the queue
   * @param {string} type - Job type (e.g., 'bulk_import')
   * @param {Object} data - Job data
   * @param {string} priority - Job priority ('low', 'normal', 'high', 'urgent')
   * @returns {Promise<Job>} Created job instance
   */
  static async addJob(type, data, priority = 'normal') {
    try {
      const job = await Job.create({
        jobType: type,
        jobData: data,
        priority,
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        scheduledAt: new Date()
      });
      
      console.log(`📋 Job queued: ${type} (ID: ${job.id}, Priority: ${priority})`);
      return job;
    } catch (error) {
      console.error('Error adding job to queue:', error);
      throw error;
    }
  }
  
  /**
   * Get the next pending job to process
   * @returns {Promise<Job|null>} Next job or null if none available
   */
  static async getNextJob() {
    try {
      const job = await Job.findNextPendingJob();
      return job;
    } catch (error) {
      console.error('Error getting next job:', error);
      throw error;
    }
  }
  
  /**
   * Process a single job
   * @param {Job} job - Job instance to process
   * @returns {Promise<boolean>} Success status
   */
  static async processJob(job) {
    if (!job) {
      return false;
    }
    
    console.log(`🔄 Processing job: ${job.jobType} (ID: ${job.id}, Attempt: ${job.attempts + 1}/${job.maxAttempts})`);
    
    try {
      // Mark job as processing
      await job.markAsProcessing();
      
      // Process based on job type
      await this.executeJob(job);
      
      // Mark job as completed
      await job.markAsCompleted();
      
      console.log(`✅ Job completed: ${job.jobType} (ID: ${job.id})`);
      return true;
      
    } catch (error) {
      console.error(`❌ Job failed: ${job.jobType} (ID: ${job.id})`, error.message);
      
      // Mark job as failed (with retry logic)
      await job.markAsFailed(error.message);
      
      // If job can still be retried, it will be scheduled for retry
      if (job.canRetry()) {
        console.log(`🔄 Job will be retried: ${job.jobType} (ID: ${job.id})`);
      } else {
        console.log(`💀 Job permanently failed: ${job.jobType} (ID: ${job.id})`);
      }
      
      return false;
    }
  }
  
  /**
   * Execute the actual job logic based on job type
   * @param {Job} job - Job instance to execute
   * @returns {Promise<void>}
   */
  static async executeJob(job) {
    switch (job.jobType) {
      case 'bulk_import':
        await this.executeBulkImportJob(job);
        break;
        
      case 'cleanup_old_jobs':
        await this.executeCleanupJob(job);
        break;
        
      case 'cleanup_old_notifications':
        await this.executeNotificationCleanupJob(job);
        break;
        
      default:
        throw new Error(`Unknown job type: ${job.jobType}`);
    }
  }
  
  /**
   * Execute a bulk import job
   * @param {Job} job - Job instance
   * @returns {Promise<void>}
   */
  static async executeBulkImportJob(job) {
    const { bulkImportId } = job.jobData;
    
    if (!bulkImportId) {
      throw new Error('Bulk import job missing bulkImportId');
    }
    
    console.log(`📥 Starting bulk import processing for import ID: ${bulkImportId}`);
    
    // Process the bulk import
    await BulkImportService.processImport(bulkImportId);
    
    console.log(`📤 Bulk import processing completed for import ID: ${bulkImportId}`);
  }
  
  /**
   * Execute a cleanup job
   * @param {Job} job - Job instance
   * @returns {Promise<void>}
   */
  static async executeCleanupJob(job) {
    console.log('🧹 Starting cleanup of old completed jobs...');
    
    const deletedCount = await Job.cleanupOldJobs();
    
    console.log(`🗑️  Cleaned up ${deletedCount} old jobs`);
  }
  
  /**
   * Execute a notification cleanup job
   * @param {Job} job - Job instance
   * @returns {Promise<void>}
   */
  static async executeNotificationCleanupJob(job) {
    console.log('🧹 Starting cleanup of old bulk import notifications...');
    
    const NotificationService = require('./NotificationService');
    const deletedCount = await NotificationService.cleanupOldBulkImportNotifications();
    
    console.log(`🗑️  Cleaned up ${deletedCount} old notifications`);
  }
  
  /**
   * Process all pending jobs (single iteration)
   * @returns {Promise<number>} Number of jobs processed
   */
  static async processAllPending() {
    let processedCount = 0;
    
    try {
      while (true) {
        const job = await this.getNextJob();
        
        if (!job) {
          break; // No more jobs
        }
        
        await this.processJob(job);
        processedCount++;
        
        // Small delay to prevent overwhelming the system
        await this.sleep(100);
      }
      
      return processedCount;
    } catch (error) {
      console.error('Error processing pending jobs:', error);
      return processedCount;
    }
  }
  
  /**
   * Get queue statistics
   * @returns {Promise<Object>} Queue statistics
   */
  static async getQueueStats() {
    try {
      const stats = await Job.findAll({
        attributes: [
          'status',
          [Job.sequelize.fn('COUNT', Job.sequelize.col('id')), 'count']
        ],
        group: ['status']
      });
      
      const result = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0
      };
      
      stats.forEach(stat => {
        result[stat.status] = parseInt(stat.dataValues.count);
        result.total += parseInt(stat.dataValues.count);
      });
      
      return result;
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    }
  }
  
  /**
   * Get jobs by status
   * @param {string} status - Job status
   * @param {number} limit - Maximum number of jobs to return
   * @returns {Promise<Job[]>} Array of jobs
   */
  static async getJobsByStatus(status, limit = 10) {
    try {
      return await Job.findAll({
        where: { status },
        order: [['createdAt', 'DESC']],
        limit
      });
    } catch (error) {
      console.error(`Error getting jobs by status ${status}:`, error);
      return [];
    }
  }
  
  /**
   * Cancel a pending job
   * @param {number} jobId - Job ID to cancel
   * @returns {Promise<boolean>} Success status
   */
  static async cancelJob(jobId) {
    try {
      const job = await Job.findByPk(jobId);
      
      if (!job) {
        return false;
      }
      
      if (job.status !== 'pending') {
        throw new Error(`Cannot cancel job with status: ${job.status}`);
      }
      
      await job.update({ status: 'cancelled' });
      
      console.log(`🚫 Job cancelled: ${job.jobType} (ID: ${job.id})`);
      return true;
    } catch (error) {
      console.error('Error cancelling job:', error);
      return false;
    }
  }
  
  /**
   * Retry a failed job
   * @param {number} jobId - Job ID to retry
   * @returns {Promise<boolean>} Success status
   */
  static async retryJob(jobId) {
    try {
      const job = await Job.findByPk(jobId);
      
      if (!job) {
        return false;
      }
      
      if (job.status !== 'failed') {
        throw new Error(`Cannot retry job with status: ${job.status}`);
      }
      
      await job.update({
        status: 'pending',
        attempts: 0,
        errorMessage: null,
        scheduledAt: new Date()
      });
      
      console.log(`🔄 Job queued for retry: ${job.jobType} (ID: ${job.id})`);
      return true;
    } catch (error) {
      console.error('Error retrying job:', error);
      return false;
    }
  }
  
  /**
   * Schedule cleanup jobs
   * @returns {Promise<void>}
   */
  static async scheduleCleanupJobs() {
    try {
      // Schedule job queue cleanup
      await this.addJob('cleanup_old_jobs', {}, 'low');
      
      // Schedule notification cleanup
      await this.addJob('cleanup_old_notifications', {}, 'low');
      
      console.log('🗓️  Cleanup jobs scheduled');
    } catch (error) {
      console.error('Error scheduling cleanup jobs:', error);
    }
  }
  
  /**
   * Utility sleep function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = JobQueue;