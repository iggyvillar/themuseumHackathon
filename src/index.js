// index.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();

// Middleware
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ Connected to MongoDB");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        process.exit(1);
    }
};

// Import routes
const reviewsRouter = require("./routes/reviews");
const sheetsRouter = require("./routes/sheets");

// Use routes
app.use("/api/reviews", reviewsRouter);
app.use("/api/sheets", sheetsRouter);

// Root route
app.get("/", (req, res) => {
    res.json({
        message: "The Museum API Server",
        version: "1.0.0",
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
        },
    });
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        database:
            mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    });
});

// Start the server
const PORT = process.env.PORT || 3000;

(async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
})();
