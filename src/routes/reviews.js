const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const GooglePlacesService = require('../services/googlePlacesService');

// Initialize Google Places service
const googlePlacesService = new GooglePlacesService(process.env.GOOGLE_PLACES_API_KEY);

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Get all reviews from database
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: placeId
 *         schema:
 *           type: string
 *         description: Filter by place ID
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [maps, sheets, other]
 *         description: Filter by source
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *           enum: [unfiltered, filtered, processed]
 *         description: Filter by state
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number to skip
 *     responses:
 *       200:
 *         description: List of reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Review'
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     skip:
 *                       type: integer
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
 * @swagger
 * /api/reviews/fetch:
 *   post:
 *     summary: Fetch reviews from Google Places API
 *     tags: [Reviews]
 *     description: Fetch reviews from Google Places and save to database with source=maps and state=unfiltered
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               placeId:
 *                 type: string
 *                 description: Google Place ID (optional if DEFAULT_PLACE_ID is set in .env)
 *                 example: ChIJ52t8jPL0K4gRX8TcXqzfMJQ
 *     parameters:
 *       - in: query
 *         name: placeId
 *         schema:
 *           type: string
 *         description: Google Place ID as query parameter
 *     responses:
 *       200:
 *         description: Reviews fetched and saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalFetched:
 *                       type: integer
 *                     totalSaved:
 *                       type: integer
 *                     totalSkipped:
 *                       type: integer
 *                     savedReviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Review'
 *       400:
 *         description: Bad request
 *       404:
 *         description: No reviews found
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
 * @swagger
 * /api/reviews/fetch:
 *   get:
 *     summary: Fetch reviews from Google Places API (GET method)
 *     tags: [Reviews]
 *     description: Alternative GET endpoint for fetching reviews (easier browser testing)
 *     parameters:
 *       - in: query
 *         name: placeId
 *         schema:
 *           type: string
 *         description: Google Place ID (optional if DEFAULT_PLACE_ID is set in .env)
 *     responses:
 *       200:
 *         description: Reviews fetched and saved successfully
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
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Get a specific review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Review'
 *       404:
 *         description: Review not found
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
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: Update a specific review
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *                 enum: [unfiltered, filtered, processed]
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       404:
 *         description: Review not found
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
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Delete a specific review
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       404:
 *         description: Review not found
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
