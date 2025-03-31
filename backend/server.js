// server.js
require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

// Global error handling
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// CORS configuration
app.use(
  cors({
    origin: "https://firewardentracker-apggb8hzfkfsbjf3.uksouth-01.azurewebsites.net",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Simple test endpoint
app.get("/test", (req, res) => {
  res.send("Node.js backend is running!");
});

// Serve static files (React app) in production
if (process.env.NODE_ENV === "production") {
  console.log("Production mode: Serving static files from build folder");
  app.use(express.static(path.join(__dirname, "build")));
}

// Log some environment details (for debugging)
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_SERVER:", process.env.DB_SERVER);
console.log("DB_NAME:", process.env.DB_NAME);

// Configure Azure SQL connection
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: Number(process.env.SQL_PORT) || 1433,
  options: {
    encrypt: true,
    enableArithAbort: true,
  },
};

let pool;

// Attempt database connection
async function connectDB() {
  try {
    pool = await sql.connect(config);
    console.log("Connected to Azure SQL Database");
  } catch (error) {
    console.error("Database connection error:", error);
    // For debugging, we are not exiting immediately.
  }
}
connectDB();

// (Temporarily comment out middleware that blocks endpoints if DB is not connected)
/*
app.use((req, res, next) => {
  if (!pool) {
    return res.status(503).json({ error: "Database not connected" });
  }
  next();
});
*/

// Define your endpoints (e.g., /generate-staff-number, /register, /login) here…
// For brevity, I include only one endpoint as an example:
app.get("/generate-staff-number", async (req, res) => {
  try {
    if (!pool) throw new Error("Database not connected");
    let staffNumber;
    let exists = true;
    do {
      staffNumber = Math.floor(1000 + Math.random() * 9000).toString();
      const result = await pool.request()
        .input("staff_number", sql.VarChar(50), staffNumber)
        .query("SELECT staff_number FROM dbo.FireWardens WHERE staff_number = @staff_number");
      exists = result.recordset.length > 0;
    } while (exists);
    res.json({ staffNumber });
  } catch (err) {
    console.error("Error generating staff number:", err.message);
    res.status(500).json({ error: "Failed to generate staff number." });
  }
});

// Catch-all route to serve React app (production)
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

// Ensure PORT is set; use default if not provided
if (!process.env.PORT) {
  console.error("Warning: PORT environment variable not set. Using default 3000.");
}
const PORT = process.env.PORT || 3000;
console.log("Starting server on port:", PORT);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
