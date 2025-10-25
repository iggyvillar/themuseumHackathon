const express = require("express");
const { getExample } = require("../controllers/basicController");

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Express API");
});

router.get("/example", getExample);

module.exports = router;
