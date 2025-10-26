const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Flexible schema that accepts any fields from Google Places API
}, { 
  strict: false,  // Allow any fields not defined in schema
  timestamps: true  // Automatically add createdAt and updatedAt
});

// Add the two required fields with defaults
reviewSchema.add({
  source: {
    type: String,
    default: 'maps',
    enum: ['maps', 'sheets', 'other']
  },
  state: {
    type: String,
    default: 'unfiltered',
    enum: ['unfiltered', 'filtered', 'processed']
  }
});

// Create indexes for common query patterns
reviewSchema.index({ placeId: 1, source: 1, state: 1 });
reviewSchema.index({ author_name: 1 }); // Google Places API field
reviewSchema.index({ rating: 1 });
reviewSchema.index({ time: 1 });

module.exports = mongoose.model('Review', reviewSchema);
