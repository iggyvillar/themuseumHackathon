const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Task = require('../models/Task');
const OpenAIService = require('../services/openaiService');
const ClickUpService = require('../services/clickupService');

// Initialize services
let openaiService = null;
let clickupService = null;

if (process.env.OPENAI_API_KEY) {
  openaiService = new OpenAIService(process.env.OPENAI_API_KEY);
}

if (process.env.CLICKUP_API_KEY && process.env.CLICKUP_LIST_ID) {
  clickupService = new ClickUpService(
    process.env.CLICKUP_API_KEY,
    process.env.CLICKUP_LIST_ID
  );
}

/**
 * @swagger
 * /api/ai/analyze-reviews:
 *   post:
 *     summary: Analyze reviews with AI and create tasks in ClickUp
 *     tags: [AI]
 *     description: Fetch reviews, analyze with OpenAI, generate tasks, and send to ClickUp
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filters:
 *                 type: object
 *                 properties:
 *                   source:
 *                     type: string
 *                     enum: [maps, sheets]
 *                     description: Filter by source
 *                   state:
 *                     type: string
 *                     enum: [unfiltered, filtered, processed]
 *                     description: Filter by state
 *                   minRating:
 *                     type: number
 *                     description: Minimum rating to include
 *                   maxRating:
 *                     type: number
 *                     description: Maximum rating to include
 *                   limit:
 *                     type: integer
 *                     default: 50
 *                     description: Maximum number of reviews to analyze
 *               sendToClickUp:
 *                 type: boolean
 *                 default: true
 *                 description: Automatically send tasks to ClickUp
 *     responses:
 *       200:
 *         description: Analysis complete
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
 *                     reviewsAnalyzed:
 *                       type: integer
 *                     tasksGenerated:
 *                       type: integer
 *                     tasksSaved:
 *                       type: integer
 *                     tasksSentToClickUp:
 *                       type: integer
 *                     tasks:
 *                       type: array
 *       400:
 *         description: OpenAI or ClickUp not configured
 */
router.post('/analyze-reviews', async (req, res) => {
  try {
    if (!openaiService) {
      return res.status(400).json({
        success: false,
        message: 'OpenAI is not configured. Set OPENAI_API_KEY in .env file'
      });
    }

    const {
      filters = {},
      sendToClickUp = true
    } = req.body;

    // Build filter for reviews
    const reviewFilter = {};
    if (filters.source) reviewFilter.source = filters.source;
    if (filters.state) reviewFilter.state = filters.state;
    if (filters.minRating !== undefined || filters.maxRating !== undefined) {
      reviewFilter.rating = {};
      if (filters.minRating !== undefined) reviewFilter.rating.$gte = filters.minRating;
      if (filters.maxRating !== undefined) reviewFilter.rating.$lte = filters.maxRating;
    }

    const limit = filters.limit || 50;

    console.log('Fetching reviews from database...');
    const reviews = await Review.find(reviewFilter)
      .sort({ createdAt: -1 })
      .limit(limit);

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No reviews found matching the filters'
      });
    }

    console.log(`Found ${reviews.length} reviews, sending to OpenAI for analysis...`);

    // Analyze reviews with OpenAI
    const aiGeneratedTasks = await openaiService.analyzeReviewsAndGenerateTasks(reviews);

    console.log(`OpenAI generated ${aiGeneratedTasks.length} tasks`);

    // Save tasks to database and optionally send to ClickUp
    const savedTasks = [];
    const sentToClickUp = [];
    const errors = [];

    for (const taskData of aiGeneratedTasks) {
      try {
        // Create task in database
        const task = new Task({
          reviewId: taskData.reviewId,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority || 'medium',
          department: taskData.department || null,
          tags: taskData.tags || [],
          customFields: {
            aiReasoning: taskData.reasoning,
            aiGenerated: true,
            generatedAt: new Date()
          }
        });

        await task.save();
        savedTasks.push(task);
        console.log(`✅ Task saved: ${task.title}`);

        // Send to ClickUp if requested and configured
        if (sendToClickUp && clickupService) {
          try {
            const clickupResponse = await clickupService.createTask({
              title: task.title,
              description: task.description,
              priority: task.priority,
              tags: task.tags
            });

            await task.markAsSent(clickupResponse.taskId, clickupResponse.url);
            sentToClickUp.push({
              taskId: task._id,
              clickupId: clickupResponse.taskId,
              clickupUrl: clickupResponse.url
            });
            console.log(`✅ Task sent to ClickUp: ${clickupResponse.url}`);

          } catch (clickupError) {
            console.error(`Failed to send task to ClickUp: ${clickupError.message}`);
            await task.markAsFailed(clickupError.message);
            errors.push({
              taskId: task._id,
              error: `ClickUp error: ${clickupError.message}`
            });
          }
        }

      } catch (error) {
        console.error(`Error processing task: ${error.message}`);
        errors.push({
          taskData: taskData.title,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Analyzed ${reviews.length} reviews and generated ${aiGeneratedTasks.length} tasks`,
      data: {
        reviewsAnalyzed: reviews.length,
        tasksGenerated: aiGeneratedTasks.length,
        tasksSaved: savedTasks.length,
        tasksSentToClickUp: sentToClickUp.length,
        tasks: savedTasks,
        clickupLinks: sentToClickUp,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Error in /api/ai/analyze-reviews:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/ai/sentiment:
 *   post:
 *     summary: Get sentiment analysis of reviews
 *     tags: [AI]
 *     description: Analyze sentiment and key themes from reviews using OpenAI
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filters:
 *                 type: object
 *                 description: Same filters as analyze-reviews
 *               limit:
 *                 type: integer
 *                 default: 50
 *     responses:
 *       200:
 *         description: Sentiment analysis complete
 */
router.post('/sentiment', async (req, res) => {
  try {
    if (!openaiService) {
      return res.status(400).json({
        success: false,
        message: 'OpenAI is not configured'
      });
    }

    const { filters = {}, limit = 50 } = req.body;

    // Build filter
    const reviewFilter = {};
    if (filters.source) reviewFilter.source = filters.source;
    if (filters.state) reviewFilter.state = filters.state;

    const reviews = await Review.find(reviewFilter)
      .sort({ createdAt: -1 })
      .limit(limit);

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No reviews found'
      });
    }

    const analysis = await openaiService.getSentimentAnalysis(reviews);

    res.json({
      success: true,
      data: {
        reviewsAnalyzed: reviews.length,
        analysis: analysis
      }
    });

  } catch (error) {
    console.error('Error in /api/ai/sentiment:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/ai/analyze-single:
 *   post:
 *     summary: Analyze a single review with AI
 *     tags: [AI]
 *     description: Analyze one review and optionally create a task
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reviewId
 *             properties:
 *               reviewId:
 *                 type: string
 *                 description: Review ID to analyze
 *               sendToClickUp:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Analysis complete
 */
router.post('/analyze-single', async (req, res) => {
  try {
    if (!openaiService) {
      return res.status(400).json({
        success: false,
        message: 'OpenAI is not configured'
      });
    }

    const { reviewId, sendToClickUp = false } = req.body;

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: 'reviewId is required'
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const taskData = await openaiService.analyzeSingleReview(review);

    if (!taskData) {
      return res.json({
        success: true,
        message: 'No action needed for this review',
        data: { taskGenerated: false }
      });
    }

    // Create task
    const task = new Task({
      reviewId: taskData.reviewId,
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority || 'medium',
      department: taskData.department || null,
      tags: taskData.tags || [],
      customFields: {
        aiReasoning: taskData.reasoning,
        aiGenerated: true
      }
    });

    await task.save();

    // Send to ClickUp if requested
    let clickupInfo = null;
    if (sendToClickUp && clickupService) {
      try {
        const clickupResponse = await clickupService.createTask({
          title: task.title,
          description: task.description,
          priority: task.priority,
          tags: task.tags
        });

        await task.markAsSent(clickupResponse.taskId, clickupResponse.url);
        clickupInfo = {
          clickupId: clickupResponse.taskId,
          clickupUrl: clickupResponse.url
        };
      } catch (error) {
        await task.markAsFailed(error.message);
      }
    }

    res.json({
      success: true,
      message: 'Review analyzed and task created',
      data: {
        task: task,
        clickup: clickupInfo
      }
    });

  } catch (error) {
    console.error('Error in /api/ai/analyze-single:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;

