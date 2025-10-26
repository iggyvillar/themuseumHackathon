const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // Associated review
  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    required: false,
    index: true
  },
  
  // Task details
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  status: {
    type: String,
    enum: ['pending', 'sent', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  
  // ClickUp integration
  clickupTaskId: {
    type: String,
    default: null,
    index: true
  },
  
  clickupListId: {
    type: String,
    default: null
  },
  
  clickupUrl: {
    type: String,
    default: null
  },
  
  // Metadata
  assignee: {
    type: String,
    default: null
  },
  
  dueDate: {
    type: Date,
    default: null
  },
  
  tags: [{
    type: String
  }],
  
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Error tracking
  errorMessage: {
    type: String,
    default: null
  },
  
  retryCount: {
    type: Number,
    default: 0
  },
  
  lastAttempt: {
    type: Date,
    default: null
  },
  
  // Timestamps
  sentAt: {
    type: Date,
    default: null
  },
  
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ reviewId: 1, status: 1 });
taskSchema.index({ clickupTaskId: 1 }, { sparse: true });

// Methods
taskSchema.methods.markAsSent = function(clickupTaskId, clickupUrl) {
  this.status = 'sent';
  this.clickupTaskId = clickupTaskId;
  this.clickupUrl = clickupUrl;
  this.sentAt = new Date();
  return this.save();
};

taskSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

taskSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.retryCount += 1;
  this.lastAttempt = new Date();
  return this.save();
};

module.exports = mongoose.model('Task', taskSchema);

