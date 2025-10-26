// index.js
require("dotenv").config(); // load .env BEFORE requiring clickup.js
const express = require("express");
const dotenv = require("dotenv");
const { connectDB } = require("./config/mongodbConfig");
const { router } = require("./routers");

(async () => {
  dotenv.config();
  await connectDB();

  const app = express();
  app.use(express.json());

  app.use("/api", router);

  app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
  });
})();
