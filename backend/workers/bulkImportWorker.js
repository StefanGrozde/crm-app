const JobQueue = require('../services/JobQueue');
const { sequelize } = require('../config/db');

class BulkImportWorker {
  constructor() {
    this.isRunning = false;
    this.currentJob = null;
    this.stats = {
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      startTime: null,
      lastProcessedAt: null
    };
  }

  /**
   * Start the background worker
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Bulk import worker is already running');
      return;
    }

    this.isRunning = true;
    this.stats.startTime = new Date();
    
    console.log('🚀 Starting bulk import background worker...');
    
    // Start the main processing loop
    this.processLoop();
    
    // Schedule periodic cleanup
    this.scheduleCleanup();
  }

  /**
   * Stop the background worker
   */
  async stop() {
    if (!this.isRunning) {
      console.log('⚠️  Bulk import worker is not running');
      return;
    }

    console.log('🛑 Stopping bulk import background worker...');
    this.isRunning = false;
    
    // Wait for current job to complete
    if (this.currentJob) {
      console.log('⏳ Waiting for current job to complete...');
      // Give it up to 30 seconds to complete
      let waitTime = 0;
      while (this.currentJob && waitTime < 30000) {
        await this.sleep(1000);
        waitTime += 1000;
      }
    }
    
    console.log('✅ Bulk import worker stopped');
  }

  /**
   * Main processing loop
   */
  async processLoop() {
    while (this.isRunning) {
      try {
        // Get next job from queue
        const job = await JobQueue.getNextJob();
        
        if (job) {
          this.currentJob = job;
          console.log(`🔄 Worker processing job: ${job.jobType} (ID: ${job.id})`);
          
          // Process the job
          const success = await JobQueue.processJob(job);
          
          // Update statistics
          this.updateStats(success);
          
          this.currentJob = null;
          
          // Small delay between jobs
          await this.sleep(500);
        } else {
          // No jobs available, wait a bit longer
          await this.sleep(5000);
        }
        
      } catch (error) {
        console.error('❌ Error in worker processing loop:', error);
        this.currentJob = null;
        
        // Wait before retrying to avoid rapid error loops
        await this.sleep(10000);
      }
    }
  }

  /**
   * Update worker statistics
   * @param {boolean} success - Whether the job was successful
   */
  updateStats(success) {
    this.stats.totalProcessed++;
    this.stats.lastProcessedAt = new Date();
    
    if (success) {
      this.stats.totalSuccessful++;
    } else {
      this.stats.totalFailed++;
    }
  }

  /**
   * Schedule periodic cleanup jobs
   */
  scheduleCleanup() {
    // Schedule cleanup every 6 hours
    setInterval(async () => {
      if (this.isRunning) {
        try {
          await JobQueue.scheduleCleanupJobs();
          console.log('🧹 Cleanup jobs scheduled');
        } catch (error) {
          console.error('Error scheduling cleanup jobs:', error);
        }
      }
    }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds
  }

  /**
   * Get worker status
   * @returns {Object} Worker status information
   */
  getStatus() {
    const uptime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
    const successRate = this.stats.totalProcessed > 0 ? 
      Math.round((this.stats.totalSuccessful / this.stats.totalProcessed) * 100) : 0;

    return {
      isRunning: this.isRunning,
      currentJob: this.currentJob ? {
        id: this.currentJob.id,
        type: this.currentJob.jobType,
        status: this.currentJob.status,
        attempts: this.currentJob.attempts
      } : null,
      stats: {
        ...this.stats,
        uptime,
        successRate
      }
    };
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} Queue statistics
   */
  async getQueueStats() {
    try {
      return await JobQueue.getQueueStats();
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    }
  }

  /**
   * Process all pending jobs immediately (for testing/admin use)
   * @returns {Promise<number>} Number of jobs processed
   */
  async processPending() {
    console.log('🔄 Processing all pending jobs...');
    
    try {
      const processedCount = await JobQueue.processAllPending();
      console.log(`✅ Processed ${processedCount} pending jobs`);
      return processedCount;
    } catch (error) {
      console.error('Error processing pending jobs:', error);
      throw error;
    }
  }

  /**
   * Health check for the worker
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck() {
    const status = this.getStatus();
    const queueStats = await this.getQueueStats();
    
    // Check if worker is healthy
    const isHealthy = this.isRunning && 
      (!this.currentJob || (Date.now() - new Date(this.currentJob.updatedAt).getTime()) < 300000); // 5 minutes
    
    return {
      healthy: isHealthy,
      timestamp: new Date(),
      worker: status,
      queue: queueStats,
      database: await this.checkDatabaseConnection()
    };
  }

  /**
   * Check database connection
   * @returns {Promise<boolean>} Database connection status
   */
  async checkDatabaseConnection() {
    try {
      await sequelize.authenticate();
      return true;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }

  /**
   * Utility sleep function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create worker instance
const worker = new BulkImportWorker();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await worker.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await worker.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  worker.stop().then(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  worker.stop().then(() => {
    process.exit(1);
  });
});

// Export for use in other modules
module.exports = worker;

// If this file is run directly, start the worker
if (require.main === module) {
  worker.start().catch(error => {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  });
}