const { spawn } = require('child_process');
const path = require('path');
const JobQueue = require('./JobQueue');

class WorkerManager {
  constructor() {
    this.workers = new Map(); // jobType -> { process, startTime, jobsProcessed }
    this.workerTimeout = 2 * 60 * 1000; // 2 minutes idle timeout
    this.cleanupInterval = null;
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Ensure a worker is running for the given job type
   * @param {string} jobType - Type of job (e.g., 'bulk_import')
   * @returns {Promise<boolean>} Whether worker was started/is running
   */
  async ensureWorker(jobType) {
    if (this.workers.has(jobType)) {
      const worker = this.workers.get(jobType);
      if (worker.process && !worker.process.killed) {
        console.log(`♻️  Worker for ${jobType} already running (PID: ${worker.process.pid})`);
        worker.lastActivity = Date.now(); // Reset timeout
        return true;
      } else {
        // Worker died, remove it
        this.workers.delete(jobType);
      }
    }

    return this.startWorker(jobType);
  }

  /**
   * Start a worker for the given job type
   * @param {string} jobType - Type of job
   * @returns {Promise<boolean>} Whether worker was started successfully
   */
  async startWorker(jobType) {
    try {
      console.log(`🚀 Starting on-demand worker for ${jobType}...`);
      
      let workerScript;
      switch (jobType) {
        case 'bulk_import':
          workerScript = path.join(__dirname, '../workers/bulkImportWorker.js');
          break;
        default:
          console.error(`❌ Unknown job type: ${jobType}`);
          return false;
      }

      // Spawn the worker process
      const workerProcess = spawn('node', [workerScript], {
        stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout/stderr
        detached: false,
        env: process.env
      });

      // Set up process monitoring
      const worker = {
        process: workerProcess,
        startTime: Date.now(),
        lastActivity: Date.now(),
        jobsProcessed: 0,
        jobType
      };

      // Handle worker output
      workerProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`[${jobType}-worker]: ${output}`);
          worker.lastActivity = Date.now(); // Update activity
        }
      });

      workerProcess.stderr.on('data', (data) => {
        const error = data.toString().trim();
        if (error) {
          console.error(`[${jobType}-worker-error]: ${error}`);
        }
      });

      // Handle worker exit
      workerProcess.on('exit', (code, signal) => {
        console.log(`🏁 Worker for ${jobType} exited (code: ${code}, signal: ${signal})`);
        this.workers.delete(jobType);
      });

      workerProcess.on('error', (error) => {
        console.error(`❌ Worker for ${jobType} error:`, error);
        this.workers.delete(jobType);
      });

      this.workers.set(jobType, worker);

      // Give worker a moment to start
      await this.sleep(1000);

      // Verify worker is still running
      if (workerProcess.killed || workerProcess.exitCode !== null) {
        console.error(`❌ Worker for ${jobType} failed to start`);
        this.workers.delete(jobType);
        return false;
      }

      console.log(`✅ Worker for ${jobType} started successfully (PID: ${workerProcess.pid})`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to start worker for ${jobType}:`, error);
      return false;
    }
  }

  /**
   * Stop a specific worker
   * @param {string} jobType - Type of job
   * @returns {Promise<boolean>} Whether worker was stopped
   */
  async stopWorker(jobType) {
    const worker = this.workers.get(jobType);
    if (!worker || !worker.process || worker.process.killed) {
      return false;
    }

    console.log(`🛑 Stopping worker for ${jobType} (PID: ${worker.process.pid})`);
    
    // Send SIGTERM for graceful shutdown
    worker.process.kill('SIGTERM');
    
    // Wait up to 10 seconds for graceful shutdown
    const timeout = setTimeout(() => {
      if (!worker.process.killed) {
        console.log(`⚡ Force killing worker for ${jobType}`);
        worker.process.kill('SIGKILL');
      }
    }, 10000);

    return new Promise((resolve) => {
      worker.process.on('exit', () => {
        clearTimeout(timeout);
        this.workers.delete(jobType);
        console.log(`✅ Worker for ${jobType} stopped`);
        resolve(true);
      });
    });
  }

  /**
   * Start cleanup interval to stop idle workers
   */
  startCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      const now = Date.now();
      
      for (const [jobType, worker] of this.workers.entries()) {
        const idleTime = now - worker.lastActivity;
        
        if (idleTime > this.workerTimeout) {
          console.log(`⏰ Worker for ${jobType} idle for ${Math.round(idleTime / 1000)}s, stopping...`);
          await this.stopWorker(jobType);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get status of all workers
   * @returns {Object} Worker status information
   */
  getWorkerStatus() {
    const status = {};
    
    for (const [jobType, worker] of this.workers.entries()) {
      const uptime = Date.now() - worker.startTime;
      const idleTime = Date.now() - worker.lastActivity;
      
      status[jobType] = {
        pid: worker.process.pid,
        running: !worker.process.killed && worker.process.exitCode === null,
        uptime: Math.round(uptime / 1000),
        idleTime: Math.round(idleTime / 1000),
        jobsProcessed: worker.jobsProcessed,
        startTime: new Date(worker.startTime),
        lastActivity: new Date(worker.lastActivity)
      };
    }
    
    return {
      workers: status,
      totalWorkers: this.workers.size,
      timeoutSeconds: Math.round(this.workerTimeout / 1000)
    };
  }

  /**
   * Trigger processing for a specific job type
   * @param {string} jobType - Type of job to process
   * @returns {Promise<boolean>} Whether processing was triggered
   */
  async triggerProcessing(jobType) {
    // Ensure worker is running
    const workerStarted = await this.ensureWorker(jobType);
    if (!workerStarted) {
      console.error(`❌ Could not start worker for ${jobType}`);
      return false;
    }

    // Check if there are pending jobs
    const queueStats = await JobQueue.getQueueStats();
    if (queueStats.pending === 0) {
      console.log(`ℹ️  No pending jobs for ${jobType}`);
      return true;
    }

    console.log(`⚡ Triggered processing for ${jobType} (${queueStats.pending} pending jobs)`);
    return true;
  }

  /**
   * Stop all workers
   * @returns {Promise<void>}
   */
  async stopAllWorkers() {
    console.log('🛑 Stopping all workers...');
    
    const stopPromises = [];
    for (const jobType of this.workers.keys()) {
      stopPromises.push(this.stopWorker(jobType));
    }
    
    await Promise.all(stopPromises);
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    console.log('✅ All workers stopped');
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const workerManager = new WorkerManager();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, stopping all workers...');
  await workerManager.stopAllWorkers();
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, stopping all workers...');
  await workerManager.stopAllWorkers();
});

module.exports = workerManager;