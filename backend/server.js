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

// CORS setup: adjust origin to match your public domain if needed
app.use(
  cors({
    origin: "https://firewardentracker-apggb8hzfkfsbjf3.uksouth-01.azurewebsites.net",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Simple test endpoint to verify backend is running
app.get("/test", (req, res) => {
  res.send("Node.js backend is running!");
});

// Serve static files (your React app) in production
if (process.env.NODE_ENV === "production") {
  console.log("Production mode: Serving static files from build folder");
  app.use(express.static(path.join(__dirname, "build")));
}

// Log environment variables (for debugging; remove sensitive info later)
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_SERVER:", process.env.DB_SERVER);
console.log("DB_NAME:", process.env.DB_NAME);

// Configure Azure SQL connection using environment variables
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

// Attempt to connect to the database
async function connectDB() {
  try {
    pool = await sql.connect(config);
    console.log("Connected to Azure SQL Database");
  } catch (error) {
    console.error("Database connection error:", error);
    // Do not exit immediately; let endpoints try to run so we can see error responses.
    // In production, you might want to exit or retry.
  }
}
connectDB();

// Commenting out this middleware temporarily for debugging DB connection issues
/*
app.use((req, res, next) => {
  if (!pool) {
    return res.status(503).json({ error: "Database not connected" });
  }
  next();
});
*/

// Endpoint: Generate a unique 4-digit staff number
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

// Endpoint: Register a new user
app.post("/register", async (req, res) => {
  const { firstName, lastName, password, staffNumber } = req.body;
  if (!firstName || !lastName || !password || !staffNumber) {
    return res.status(400).json({ error: "All fields are required" });
  }
  try {
    if (!pool) throw new Error("Database not connected");
    const username = `${lastName}_${firstName.charAt(0)}_${staffNumber}`;
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.request()
      .input("staff_number", sql.VarChar(50), staffNumber)
      .input("first_name", sql.VarChar(100), firstName)
      .input("last_name", sql.VarChar(100), lastName)
      .input("username", sql.VarChar(100), username)
      .input("password_hash", sql.VarChar(255), hashedPassword)
      .query(`
        INSERT INTO dbo.FireWardens (staff_number, first_name, last_name, username, password_hash)
        VALUES (@staff_number, @first_name, @last_name, @username, @password_hash)
      `);
    res.json({ message: "Registration successful", username, staffNumber });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed." });
  }
});

// Endpoint: Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "All fields are required" });
  try {
    if (!pool) throw new Error("Database not connected");
    const result = await pool.request()
      .input("username", sql.VarChar(100), username)
      .query("SELECT * FROM dbo.FireWardens WHERE username = @username");
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    const user = result.recordset[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    const token = jwt.sign({ userId: user.staff_number }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({
      token,
      user: {
        staffNumber: user.staff_number,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed." });
  }
});

// Catch-all route: serve the React app for any other route (production only)
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

// Ensure PORT is set; if not, use a default (Azure should set PORT automatically)
if (!process.env.PORT) {
  console.error("Warning: PORT environment variable not set. Using default 3000.");
}
const PORT = process.env.PORT || 3000;
console.log("Starting server on port:", PORT);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
