const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const GooglePlacesService = require('../services/googlePlacesService');

// Initialize Google Places service
const googlePlacesService = new GooglePlacesService(process.env.GOOGLE_PLACES_API_KEY);

/**
 * GET /api/reviews
 * Get all reviews from database with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { placeId, source, state, limit = 50, skip = 0 } = req.query;

    // Build filter object
    const filter = {};
    if (placeId) filter.placeId = placeId;
    if (source) filter.source = source;
    if (state) filter.state = state;

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Review.countDocuments(filter);

    res.json({
      success: true,
      data: {
        reviews,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });

  } catch (error) {
    console.error('Error in /api/reviews GET:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Shared function to fetch and save reviews
 */
async function fetchAndSaveReviews(placeId) {
  console.log(`Fetching reviews for place ID: ${placeId}`);

  // Fetch reviews from Google Places API
  const reviews = await googlePlacesService.fetchReviews(placeId);

  if (reviews.length === 0) {
    return {
      success: false,
      message: 'No reviews found for this place',
      statusCode: 404
    };
  }

  // Save reviews to database
  const savedReviews = [];
  const errors = [];
  const skipped = [];

  for (const reviewData of reviews) {
    try {
      // Check if review already exists (based on placeId, author_name, and time)
      const existingReview = await Review.findOne({
        placeId: reviewData.placeId,
        author_name: reviewData.author_name,
        time: reviewData.time
      });

      if (existingReview) {
        console.log(`Review already exists for ${reviewData.author_name} at ${reviewData.placeName}`);
        skipped.push({
          author_name: reviewData.author_name,
          reason: 'Already exists'
        });
        continue;
      }

      const review = new Review(reviewData);
      const savedReview = await review.save();
      savedReviews.push(savedReview);
      console.log(`Saved review from ${reviewData.author_name} for ${reviewData.placeName}`);
    } catch (error) {
      console.error(`Error saving review from ${reviewData.author_name}:`, error.message);
      errors.push({
        authorName: reviewData.author_name,
        error: error.message
      });
    }
  }

  return {
    success: true,
    message: `Successfully processed ${reviews.length} reviews`,
    data: {
      totalFetched: reviews.length,
      totalSaved: savedReviews.length,
      totalSkipped: skipped.length,
      savedReviews: savedReviews,
      skipped: skipped,
      errors: errors
    }
  };
}

/**
 * POST /api/reviews/fetch
 * Fetch reviews from Google Places API and save them to database
 * Accepts placeId in body, query parameter, or uses default from .env
 */
router.post('/fetch', async (req, res) => {
  try {
    // Accept placeId from body, query parameter, or use default from env
    const placeId = req.body?.placeId || req.query?.placeId || process.env.DEFAULT_PLACE_ID;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: 'Place ID is required in request body, query parameter, or set DEFAULT_PLACE_ID in .env',
        example: {
          body: { placeId: "ChIJ52t8jPL0K4gRX8TcXqzfMJQ" },
          query: "?placeId=ChIJ52t8jPL0K4gRX8TcXqzfMJQ",
          env: "DEFAULT_PLACE_ID=ChIJ52t8jPL0K4gRX8TcXqzfMJQ"
        }
      });
    }

    const result = await fetchAndSaveReviews(placeId);
    
    if (result.statusCode) {
      return res.status(result.statusCode).json(result);
    }
    
    res.json(result);

  } catch (error) {
    console.error('Error in /api/reviews/fetch POST:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/reviews/fetch
 * Alternative GET endpoint for fetching reviews (easier testing)
 * Uses placeId from query parameter or default from .env
 */
router.get('/fetch', async (req, res) => {
  try {
    const placeId = req.query?.placeId || process.env.DEFAULT_PLACE_ID;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: 'Place ID is required as query parameter or set DEFAULT_PLACE_ID in .env',
        example: {
          query: 'GET /api/reviews/fetch?placeId=ChIJ52t8jPL0K4gRX8TcXqzfMJQ',
          env: 'DEFAULT_PLACE_ID=ChIJ52t8jPL0K4gRX8TcXqzfMJQ'
        }
      });
    }

    const result = await fetchAndSaveReviews(placeId);
    
    if (result.statusCode) {
      return res.status(result.statusCode).json(result);
    }
    
    res.json(result);

  } catch (error) {
    console.error('Error in /api/reviews/fetch GET:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/reviews/:id
 * Get a specific review by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: review
    });

  } catch (error) {
    console.error('Error in /api/reviews/:id GET:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * PUT /api/reviews/:id
 * Update a specific review
 */
router.put('/:id', async (req, res) => {
  try {
    const { state, text } = req.body;
    const updateData = {};

    if (state) updateData.state = state;
    if (text !== undefined) updateData.text = text;

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: review
    });

  } catch (error) {
    console.error('Error in /api/reviews/:id PUT:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * DELETE /api/reviews/:id
 * Delete a specific review
 */
router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Error in /api/reviews/:id DELETE:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
