// app.js

// dotenv reads your .env file and makes all variables
// available via process.env throughout the entire app
require("dotenv").config();

const express = require("express");

// cors allows other websites/apps to call your API
// without it, browsers block cross-origin requests
const cors = require("cors");

// helmet adds security headers to every response automatically
// protects against common attacks like clickjacking, XSS etc
const helmet = require("helmet");

// create the Express application
const app = express();

// ─── Middleware ───────────────────────────────────────
// middleware runs on every request before it hits your route

// helmet security headers
app.use(helmet());

// cors — allow all origins in development
app.use(cors());

// parse incoming JSON request bodies
// without this, req.body is undefined when someone POST's JSON
app.use(express.json());

// parse URL encoded form data
app.use(express.urlencoded({ extended: true }));


// ─── Routes ────────────────────────────────────────────
const experiencesRoutes = require('./src/routes/experiences.routes');
app.use('/api/experiences', experiencesRoutes);

const companiesRoutes = require("./src/routes/companies.routes");
app.use("/api/companies", companiesRoutes);

// ─── Health check route ───────────────────────────────
// this is a simple route to verify the server is running
// hit GET /health in Postman and you should get {"status":"ok"}
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Placement Intel API is running",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 handler ─────────────────────────────────────
// if no route matched, send a clean 404 response
// this must come AFTER all routes
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// ─── Global error handler ─────────────────────────────
// if any route throws an error, it lands here
// the 4 parameters (err, req, res, next) tell Express
// this is an error handler — all 4 are required
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong",
    message:
      process.env.NODE_ENV === "development" ?
        err.message // show full error in development
      : "Internal server error", // hide details in production
  });
});

// export the app so server.js can use it
module.exports = app;
