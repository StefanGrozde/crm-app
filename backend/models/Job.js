const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  jobType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'job_type'
  },
  jobData: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'job_data'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending',
    allowNull: false
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  maxAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    allowNull: false,
    field: 'max_attempts'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },
  scheduledAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'scheduled_at'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'started_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  }
}, {
  tableName: 'job_queue',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['status', 'priority']
    },
    {
      fields: ['scheduled_at']
    },
    {
      fields: ['job_type']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
Job.prototype.canRetry = function() {
  return this.attempts < this.maxAttempts;
};

Job.prototype.markAsProcessing = function() {
  return this.update({
    status: 'processing',
    startedAt: new Date(),
    attempts: this.attempts + 1
  });
};

Job.prototype.markAsCompleted = function() {
  return this.update({
    status: 'completed',
    completedAt: new Date()
  });
};

Job.prototype.markAsFailed = function(errorMessage) {
  const canRetry = this.canRetry();
  return this.update({
    status: canRetry ? 'pending' : 'failed',
    errorMessage,
    scheduledAt: canRetry ? new Date(Date.now() + 60000) : null // retry in 1 minute
  });
};

// Static methods
Job.findNextPendingJob = function() {
  return Job.findOne({
    where: { status: 'pending' },
    order: [
      ['priority', 'DESC'], // high priority first
      ['scheduled_at', 'ASC'] // oldest first
    ]
  });
};

Job.cleanupOldJobs = function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return Job.destroy({
    where: {
      status: 'completed',
      completedAt: {
        [require('sequelize').Op.lt]: sevenDaysAgo
      }
    }
  });
};

module.exports = Job;