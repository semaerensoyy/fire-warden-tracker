// minimal-server.js
require("dotenv").config();
const express = require("express");
const app = express();

app.get("/test", (req, res) => {
  res.send("Minimal server is running!");
});

const PORT = process.env.PORT || 3000;
console.log("Starting minimal server on port:", PORT);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
