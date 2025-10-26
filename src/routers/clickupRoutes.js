const express = require("express");
const { getClicks, createClick } = require("../controllers/clickController");

const router = express.Router();

router.get("/", getClicks);

router.post("/", createClick);

module.exports = router;
