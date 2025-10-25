const express = require("express");
const basicRoutes = require("./basicRoutes");

const router = express.Router();

// Mount basic routes
router.use("/", basicRoutes);

module.exports = { router };
