// index.js
require('dotenv').config();
const express = require("express");
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const reviewsRouter = require('./routes/reviews');
const sheetsRouter = require('./routes/sheets');

// built-in middleware: parse JSON body
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Routes
app.use('/api/reviews', reviewsRouter);
app.use('/api/sheets', sheetsRouter);

// simple route
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
        delete: "DELETE /api/reviews/:id"
      },
      sheets: {
        fetch: "POST /api/sheets/fetch",
        preview: "GET /api/sheets/preview",
        metadata: "GET /api/sheets/metadata",
        reviews: "GET /api/sheets/reviews"
      }
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/`);
});
