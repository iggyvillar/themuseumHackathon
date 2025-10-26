// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { connectDB } = require("./config/database");

const app = express();

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Import routes
const reviewsRouter = require("./routes/reviews");
const sheetsRouter = require("./routes/sheets");
const tasksRouter = require("./routes/tasks");
const aiRouter = require("./routes/ai");
const healthRouter = require("./routes/health");

// Use routes
app.use("/api/reviews", reviewsRouter);
app.use("/api/sheets", sheetsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/ai", aiRouter);
app.use("/", healthRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error",
        error: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
        availableRoutes: ["/", "/health", "/api-docs", "/api/reviews", "/api/sheets", "/api/tasks"]
    });
});

// Start the server
const PORT = process.env.PORT || 3000;

(async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 The Museum API Server`);
        console.log(`${'='.repeat(60)}`);
        console.log(`📍 Server: http://localhost:${PORT}`);
        console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
        console.log(`❤️  Health: http://localhost:${PORT}/health`);
        console.log(`${'='.repeat(60)}\n`);
    });
})();
