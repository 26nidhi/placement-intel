// src/routes/companies.routes.js

const express = require("express");
const router = express.Router();

const companiesController = require("../controllers/companies.controller");

// GET /api/companies
// returns all companies we have data for
router.get("/", companiesController.getAllCompanies);

// GET /api/companies/:slug/summary
// returns aggregated pattern for one company
// :slug is a URL parameter — "amazon", "google", "zepto"
router.get("/:slug/summary", companiesController.getCompanyPattern);

// GET /api/companies/:slug/experiences
// returns individual experiences list for one company
// supports filters: ?year=2024&result=selected&page=1
router.get("/:slug/experiences", companiesController.getCompanyExperiences);

module.exports = router;
