// index.js
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// built-in middleware: parse JSON body
app.use(express.json());

// simple route
app.get("/", (req, res) => {
  res.send("Hello from Express 👋");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
