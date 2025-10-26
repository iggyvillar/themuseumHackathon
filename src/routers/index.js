const express = require("express");
const clickupRoutes = require("./clickUpRoute");

const router = express.Router();

router.use("/clickup", clickupRoutes);

module.exports = { router };
