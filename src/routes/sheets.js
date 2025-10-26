const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const GoogleSheetsService = require('../services/googleSheetsService');

// Initialize Google Sheets service
const googleSheetsService = new GoogleSheetsService(
  process.env.GOOGLE_SHEETS_API_KEY,
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  process.env.GOOGLE_SHEET_ID
);

/**
 * Shared function to fetch and save reviews from Google Sheets
 */
async function fetchAndSaveSheetReviews(range, columnMapping = {}) {
  console.log(`Fetching reviews from Google Sheet: ${process.env.GOOGLE_SHEET_ID}`);

  // Fetch reviews from Google Sheets
  const reviews = await googleSheetsService.fetchReviews(range, columnMapping);

  if (reviews.length === 0) {
    return {
      success: false,
      message: 'No reviews found in Google Sheet',
      statusCode: 404
    };
  }

  // Save reviews to database
  const savedReviews = [];
  const errors = [];
  const skipped = [];

  for (const reviewData of reviews) {
    try {
      // Check if review already exists (based on source, author_name, and time)
      const existingReview = await Review.findOne({
        source: 'sheets',
        author_name: reviewData.author_name,
        time: reviewData.time,
        'formData.timestamp': reviewData.formData.timestamp
      });

      if (existingReview) {
        console.log(`Sheet review already exists for ${reviewData.author_name} at ${reviewData.time}`);
        skipped.push({
          author_name: reviewData.author_name,
          reason: 'Already exists',
          timestamp: reviewData.formData.timestamp
        });
        continue;
      }

      const review = new Review(reviewData);
      const savedReview = await review.save();
      savedReviews.push(savedReview);
      console.log(`Saved sheet review from ${reviewData.author_name}`);
    } catch (error) {
      console.error(`Error saving sheet review from ${reviewData.author_name}:`, error.message);
      errors.push({
        authorName: reviewData.author_name,
        error: error.message,
        timestamp: reviewData.formData.timestamp
      });
    }
  }

  return {
    success: true,
    message: `Successfully processed ${reviews.length} sheet reviews`,
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
 * POST /api/sheets/fetch
 * Fetch reviews from Google Sheets and save them to database
 * Accepts range and columnMapping in body or query parameters
 */
router.post('/fetch', async (req, res) => {
  try {
    const { 
      range = process.env.GOOGLE_SHEETS_RANGE || 'Form Responses 1!A2:Z',
      columnMapping = {}
    } = req.body;

    if (!process.env.GOOGLE_SHEET_ID) {
      return res.status(400).json({
        success: false,
        message: 'GOOGLE_SHEET_ID is required in .env file',
        example: 'GOOGLE_SHEET_ID=your_google_sheet_id_here'
      });
    }

    const result = await fetchAndSaveSheetReviews(range, columnMapping);
    
    if (result.statusCode) {
      return res.status(result.statusCode).json(result);
    }
    
    res.json(result);

  } catch (error) {
    console.error('Error in /api/sheets/fetch POST:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/sheets/fetch
 * Alternative GET endpoint for fetching sheet reviews (easier testing)
 * Accepts range and columnMapping as query parameters
 */
router.get('/fetch', async (req, res) => {
  try {
    const { 
      range = process.env.GOOGLE_SHEETS_RANGE || 'Form Responses 1!A2:Z',
      columnMapping: columnMappingStr
    } = req.query;

    let columnMapping = {};
    if (columnMappingStr) {
      try {
        columnMapping = JSON.parse(columnMappingStr);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid columnMapping JSON format',
          example: '?columnMapping={"timestamp":0,"name":1,"rating":3,"text":4}'
        });
      }
    }

    if (!process.env.GOOGLE_SHEET_ID) {
      return res.status(400).json({
        success: false,
        message: 'GOOGLE_SHEET_ID is required in .env file',
        example: 'GOOGLE_SHEET_ID=your_google_sheet_id_here'
      });
    }

    const result = await fetchAndSaveSheetReviews(range, columnMapping);
    
    if (result.statusCode) {
      return res.status(result.statusCode).json(result);
    }
    
    res.json(result);

  } catch (error) {
    console.error('Error in /api/sheets/fetch GET:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/sheets/metadata
 * Get Google Sheet metadata (title, sheets info)
 */
router.get('/metadata', async (req, res) => {
  try {
    if (!process.env.GOOGLE_SHEET_ID) {
      return res.status(400).json({
        success: false,
        message: 'GOOGLE_SHEET_ID is required in .env file'
      });
    }

    const metadata = await googleSheetsService.getSheetMetadata();
    
    res.json({
      success: true,
      data: metadata
    });

  } catch (error) {
    console.error('Error in /api/sheets/metadata:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/sheets/preview
 * Preview sheet data without saving to database
 */
router.get('/preview', async (req, res) => {
  try {
    const { 
      range = process.env.GOOGLE_SHEETS_RANGE || 'Form Responses 1!A2:Z',
      limit = 5
    } = req.query;

    if (!process.env.GOOGLE_SHEET_ID) {
      return res.status(400).json({
        success: false,
        message: 'GOOGLE_SHEET_ID is required in .env file'
      });
    }

    const rows = await googleSheetsService.getSheetData(range);
    const previewRows = rows.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        totalRows: rows.length,
        previewRows: previewRows,
        range: range,
        note: 'This is a preview. Use /fetch to save to database.'
      }
    });

  } catch (error) {
    console.error('Error in /api/sheets/preview:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/sheets/reviews
 * Get all sheet reviews from database with optional filtering
 */
router.get('/reviews', async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const reviews = await Review.find({ source: 'sheets' })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Review.countDocuments({ source: 'sheets' });

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
    console.error('Error in /api/sheets/reviews GET:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
