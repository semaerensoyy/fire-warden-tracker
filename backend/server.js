// Load environment variables
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

// CORS configuration: allow requests from your public domain
app.use(
  cors({
    origin: "https://firewardentracker-apggb8hzfkfsbjf3.uksouth-01.azurewebsites.net",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Test endpoint to confirm Node.js is running
app.get('/test', (req, res) => {
  res.send('Node.js backend is running!');
});

// Serve static files from the React build folder in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));
}

// Azure SQL connection configuration from environment variables
const config = {
  user: process.env.DB_USER,               // e.g., s.erensoy.22
  password: process.env.DB_PASS,           // e.g., 04092002Sa
  server: process.env.DB_SERVER,           // e.g., firewardenapp-server.database.windows.net
  database: process.env.DB_NAME,           // e.g., firewarden_db
  port: Number(process.env.SQL_PORT) || 1433,
  options: {
    encrypt: true,
    enableArithAbort: true,
  },
};

let pool;
async function connectDB() {
  try {
    pool = await sql.connect(config);
    console.log("Connected to Azure SQL Database");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
}
connectDB();

// Middleware to check DB connectivity
app.use((req, res, next) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  next();
});

// --- API Endpoints ---

// Generate a unique 4-digit staff number
app.get("/generate-staff-number", async (req, res) => {
  try {
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

// Register a new user
app.post("/register", async (req, res) => {
  const { firstName, lastName, password, staffNumber } = req.body;
  if (!firstName || !lastName || !password || !staffNumber) {
    return res.status(400).json({ error: "All fields are required" });
  }
  try {
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

// Login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "All fields are required" });
  try {
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

// Retrieve all logs
app.get("/logs", async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT id, staff_number, first_name, last_name, location, timestamp 
      FROM dbo.WardenLogs 
      ORDER BY timestamp DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ error: "Failed to fetch logs." });
  }
});

// Log a new location entry
app.post("/logs", async (req, res) => {
  const { staffNumber, firstName, lastName, location } = req.body;
  if (!staffNumber || !firstName || !lastName || !location) {
    return res.status(400).json({ error: "All fields are required." });
  }
  try {
    await pool.request()
      .input("staff_number", sql.VarChar(50), staffNumber)
      .input("first_name", sql.VarChar(100), firstName)
      .input("last_name", sql.VarChar(100), lastName)
      .input("location", sql.VarChar(100), location)
      .query(`
        INSERT INTO dbo.WardenLogs (staff_number, first_name, last_name, location)
        VALUES (@staff_number, @first_name, @last_name, @location)
      `);
    res.status(201).json({ message: "Warden location logged successfully!" });
  } catch (err) {
    console.error("Error creating log:", err);
    res.status(500).json({ error: "Failed to log location." });
  }
});

// Update an existing log entry
app.put("/logs/:id", async (req, res) => {
  const { id } = req.params;
  const { staff_number, first_name, last_name, location } = req.body;
  if (!staff_number || !first_name || !last_name || !location) {
    return res.status(400).json({ error: "All fields are required." });
  }
  try {
    await pool.request()
      .input("id", sql.Int, id)
      .input("staff_number", sql.VarChar(50), staff_number)
      .input("first_name", sql.VarChar(100), first_name)
      .input("last_name", sql.VarChar(100), last_name)
      .input("location", sql.VarChar(100), location)
      .query(`
         UPDATE dbo.WardenLogs
         SET staff_number = @staff_number,
             first_name = @first_name,
             last_name = @last_name,
             location = @location,
             timestamp = GETDATE()
         WHERE id = @id
      `);
    res.json({ message: "Log updated successfully!" });
  } catch (err) {
    console.error("Error updating log:", err);
    res.status(500).json({ error: "Failed to update log." });
  }
});

// Delete a log entry
app.delete("/logs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM dbo.WardenLogs WHERE id = @id");
    res.json({ message: "Log deleted successfully!" });
  } catch (err) {
    console.error("Error deleting log:", err);
    res.status(500).json({ error: "Failed to delete log." });
  }
});

// Catch-all: Serve React's index.html for any other route in production
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

// Ensure we have a PORT in production (Azure will set this automatically)
if (!process.env.PORT) {
  console.error("Error: PORT environment variable not set in production.");
  process.exit(1);
}
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
