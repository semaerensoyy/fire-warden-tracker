// test-db.js
require("dotenv").config();
const sql = require("mssql");

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

sql.connect(config)
  .then(() => {
    console.log("Connected to Azure SQL Database successfully!");
    sql.close();
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });
