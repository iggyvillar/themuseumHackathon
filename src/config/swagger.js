const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'The Museum Review API',
      version: '1.0.0',
      description: 'API for managing reviews from Google Maps and Google Sheets, with ClickUp task integration',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Reviews',
        description: 'Google Maps reviews management',
      },
      {
        name: 'Sheets',
        description: 'Google Sheets reviews management',
      },
      {
        name: 'Tasks',
        description: 'Task management and ClickUp integration',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
    components: {
      schemas: {
        Review: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'MongoDB ObjectId',
            },
            source: {
              type: 'string',
              enum: ['maps', 'sheets', 'other'],
              description: 'Source of the review',
            },
            state: {
              type: 'string',
              enum: ['unfiltered', 'filtered', 'processed'],
              description: 'Processing state of the review',
            },
            placeId: {
              type: 'string',
              description: 'Google Place ID or identifier',
            },
            placeName: {
              type: 'string',
              description: 'Name of the place',
            },
            author_name: {
              type: 'string',
              description: 'Review author name',
            },
            rating: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Rating (1-5)',
            },
            text: {
              type: 'string',
              description: 'Review text content',
            },
            time: {
              type: 'number',
              description: 'Unix timestamp',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Task: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'MongoDB ObjectId',
            },
            reviewId: {
              type: 'string',
              description: 'Associated review ID',
            },
            title: {
              type: 'string',
              description: 'Task title',
            },
            description: {
              type: 'string',
              description: 'Task description',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
            },
            status: {
              type: 'string',
              enum: ['pending', 'sent', 'completed', 'failed'],
            },
            clickupTaskId: {
              type: 'string',
              description: 'ClickUp task ID after creation',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            error: {
              type: 'string',
              description: 'Detailed error information',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

