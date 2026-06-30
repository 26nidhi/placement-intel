// src/config/db.js

// 'pg' is the library that lets Node.js talk to PostgreSQL
const { Pool } = require("pg");

// A "Pool" manages multiple database connections automatically.
// Why a pool instead of one single connection?
// Your API will get many requests at the same time. If we used
// just ONE connection, requests would have to wait in line for
// their turn to talk to the database — very slow.
// A pool keeps several connections open and ready, reusing them
// across requests. This is the standard way every production
// Node.js app talks to PostgreSQL.

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test the connection once when the app starts
// This helps us catch a wrong password or wrong DB name
// immediately, instead of failing silently on the first request
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Failed to connect to PostgreSQL:", err.message);
    return;
  }
  console.log("✅ Connected to PostgreSQL");
  release(); // give the connection back to the pool
});

// export the pool so every other file in our app can run queries
module.exports = pool;
