const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * @swagger
 * /:
 *   get:
 *     summary: API information and endpoints
 *     tags: [Health]
 *     description: Get API information, version, and available endpoints
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: The Museum Review & Task Management API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 documentation:
 *                   type: string
 *                   example: /api-docs
 *                 architecture:
 *                   type: object
 *                   properties:
 *                     flow:
 *                       type: string
 *                     description:
 *                       type: string
 *                 endpoints:
 *                   type: object
 */
router.get('/', (req, res) => {
    res.json({
        message: "The Museum Review & Task Management API",
        version: "1.0.0",
        documentation: "/api-docs",
        architecture: {
            flow: "Google Maps/Sheets → Reviews DB → Tasks DB → ClickUp",
            description: "Fetch reviews from multiple sources, store in MongoDB, create tasks for 3rd party, and sync to ClickUp"
        },
        endpoints: {
            reviews: {
                fetch: "POST /api/reviews/fetch",
                getAll: "GET /api/reviews",
                getById: "GET /api/reviews/:id",
                update: "PUT /api/reviews/:id",
                delete: "DELETE /api/reviews/:id",
            },
            sheets: {
                fetch: "POST /api/sheets/fetch",
                preview: "GET /api/sheets/preview",
                metadata: "GET /api/sheets/metadata",
                reviews: "GET /api/sheets/reviews",
            },
            tasks: {
                create: "POST /api/tasks",
                getAll: "GET /api/tasks",
                getById: "GET /api/tasks/:id",
                send: "POST /api/tasks/:id/send",
                bulkSend: "POST /api/tasks/bulk/send",
                update: "PUT /api/tasks/:id",
                delete: "DELETE /api/tasks/:id",
            },
        },
    });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     description: Check system health, database status, and service configuration
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-01-01T00:00:00.000Z
 *                 database:
 *                   type: string
 *                   enum: [Connected, Disconnected]
 *                   example: Connected
 *                 services:
 *                   type: object
 *                   properties:
 *                     googlePlaces:
 *                       type: string
 *                       enum: [Configured, Not configured]
 *                     googleSheets:
 *                       type: string
 *                       enum: [Configured, Not configured]
 *                     clickup:
 *                       type: string
 *                       enum: [Configured, Not configured]
 */
router.get('/health', (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        database:
            mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
        services: {
            googlePlaces: process.env.GOOGLE_PLACES_API_KEY ? "Configured" : "Not configured",
            googleSheets: process.env.GOOGLE_SHEET_ID ? "Configured" : "Not configured",
            clickup: process.env.CLICKUP_API_KEY ? "Configured" : "Not configured"
        }
    });
});

module.exports = router;

