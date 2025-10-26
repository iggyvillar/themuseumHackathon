const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Review = require('../models/Review');
const ClickUpService = require('../services/clickupService');

// Initialize ClickUp service
let clickupService = null;
if (process.env.CLICKUP_API_KEY && process.env.CLICKUP_LIST_ID) {
  clickupService = new ClickUpService(
    process.env.CLICKUP_API_KEY,
    process.env.CLICKUP_LIST_ID
  );
}

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               reviewId:
 *                 type: string
 *                 description: Associated review ID
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               assignee:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               sendToClickUp:
 *                 type: boolean
 *                 description: Send task to ClickUp immediately
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', async (req, res) => {
  try {
    const {
      reviewId,
      title,
      description,
      priority = 'medium',
      assignee,
      dueDate,
      tags = [],
      sendToClickUp = false
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    // Validate reviewId if provided
    if (reviewId) {
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }
    }

    // Create task
    const task = new Task({
      reviewId,
      title,
      description,
      priority,
      assignee,
      dueDate,
      tags
    });

    await task.save();

    // Send to ClickUp if requested
    if (sendToClickUp && clickupService) {
      try {
        const clickupResponse = await clickupService.createTask({
          title,
          description,
          priority,
          assignee,
          dueDate,
          tags
        });

        await task.markAsSent(clickupResponse.taskId, clickupResponse.url);
      } catch (error) {
        await task.markAsFailed(error.message);
        console.error('Failed to send task to ClickUp:', error.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });

  } catch (error) {
    console.error('Error in POST /api/tasks:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, completed, failed]
 *       - in: query
 *         name: reviewId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/', async (req, res) => {
  try {
    const { status, reviewId, limit = 50, skip = 0 } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (reviewId) filter.reviewId = reviewId;

    const tasks = await Task.find(filter)
      .populate('reviewId', 'author_name placeName rating text source')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Task.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tasks,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });

  } catch (error) {
    console.error('Error in GET /api/tasks:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a specific task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task details
 *       404:
 *         description: Task not found
 */
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('reviewId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });

  } catch (error) {
    console.error('Error in GET /api/tasks/:id:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/tasks/{id}/send:
 *   post:
 *     summary: Send a task to ClickUp
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task sent to ClickUp
 *       404:
 *         description: Task not found
 */
router.post('/:id/send', async (req, res) => {
  try {
    if (!clickupService) {
      return res.status(400).json({
        success: false,
        message: 'ClickUp integration not configured. Set CLICKUP_API_KEY and CLICKUP_LIST_ID in .env'
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (task.status === 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Task already sent to ClickUp',
        data: { clickupUrl: task.clickupUrl }
      });
    }

    // Send to ClickUp
    try {
      const clickupResponse = await clickupService.createTask({
        title: task.title,
        description: task.description,
        priority: task.priority,
        assignee: task.assignee,
        dueDate: task.dueDate,
        tags: task.tags
      });

      await task.markAsSent(clickupResponse.taskId, clickupResponse.url);

      res.json({
        success: true,
        message: 'Task sent to ClickUp successfully',
        data: {
          task,
          clickupUrl: clickupResponse.url
        }
      });

    } catch (error) {
      await task.markAsFailed(error.message);
      
      res.status(500).json({
        success: false,
        message: 'Failed to send task to ClickUp',
        error: error.message
      });
    }

  } catch (error) {
    console.error('Error in POST /api/tasks/:id/send:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
 */
router.put('/:id', async (req, res) => {
  try {
    const { title, description, priority, status, assignee, dueDate, tags } = req.body;

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Update fields
    if (title) task.title = title;
    if (description) task.description = description;
    if (priority) task.priority = priority;
    if (status) task.status = status;
    if (assignee) task.assignee = assignee;
    if (dueDate) task.dueDate = dueDate;
    if (tags) task.tags = tags;

    await task.save();

    // Update in ClickUp if already sent
    if (task.clickupTaskId && clickupService) {
      try {
        await clickupService.updateTask(task.clickupTaskId, {
          name: title,
          description,
          priority,
          assignees: assignee ? [assignee] : undefined,
          due_date: dueDate ? new Date(dueDate).getTime() : undefined,
          tags
        });
      } catch (error) {
        console.error('Failed to update ClickUp task:', error.message);
      }
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });

  } catch (error) {
    console.error('Error in PUT /api/tasks/:id:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 */
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Delete from ClickUp if it exists there
    if (task.clickupTaskId && clickupService) {
      try {
        await clickupService.deleteTask(task.clickupTaskId);
      } catch (error) {
        console.error('Failed to delete ClickUp task:', error.message);
      }
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/tasks/:id:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/tasks/bulk/send:
 *   post:
 *     summary: Send multiple pending tasks to ClickUp
 *     tags: [Tasks]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               limit:
 *                 type: integer
 *                 default: 10
 *     responses:
 *       200:
 *         description: Bulk send completed
 */
router.post('/bulk/send', async (req, res) => {
  try {
    if (!clickupService) {
      return res.status(400).json({
        success: false,
        message: 'ClickUp integration not configured'
      });
    }

    const { limit = 10 } = req.body;

    const pendingTasks = await Task.find({ status: 'pending' })
      .limit(parseInt(limit));

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const task of pendingTasks) {
      try {
        const clickupResponse = await clickupService.createTask({
          title: task.title,
          description: task.description,
          priority: task.priority,
          assignee: task.assignee,
          dueDate: task.dueDate,
          tags: task.tags
        });

        await task.markAsSent(clickupResponse.taskId, clickupResponse.url);
        results.success++;

      } catch (error) {
        await task.markAsFailed(error.message);
        results.failed++;
        results.errors.push({
          taskId: task._id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${pendingTasks.length} tasks`,
      data: results
    });

  } catch (error) {
    console.error('Error in POST /api/tasks/bulk/send:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;

