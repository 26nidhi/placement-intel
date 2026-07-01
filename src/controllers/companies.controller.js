// src/controllers/companies.controller.js

const companiesService = require("../services/companies.service");

// ─────────────────────────────────────────────────────
// GET /api/companies
// Returns list of all companies we have data for

async function getAllCompanies(req, res, next) {
  try {
    const companies = await companiesService.getAllCompanies();

    res.json({
      total: companies.length,
      companies,
    });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────
// GET /api/companies/:slug/summary
// Returns aggregated pattern for a company
// Example: GET /api/companies/amazon/summary

async function getCompanyPattern(req, res, next) {
  try {
    const { slug } = req.params;
    // req.params contains URL parameters — :slug from the route
    // so /api/companies/amazon/summary → slug = "amazon"

    const { year } = req.query;
    // req.query contains query string parameters
    // /api/companies/amazon/summary?year=2024 → year = "2024"

    const pattern = await companiesService.getCompanyPattern(slug, {
      year: year ? parseInt(year) : null,
    });

    if (!pattern) {
      return res.status(404).json({
        error: `No data found for company: ${slug}`,
      });
    }

    res.json(pattern);
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────
// GET /api/companies/:slug/experiences
// Returns individual experiences list for a company
// With optional filters: ?year=2024&result=selected&page=1

async function getCompanyExperiences(req, res, next) {
  try {
    const { slug } = req.params;
    const { year, result, page, limit } = req.query;

    const data = await companiesService.getCompanyExperiences(slug, {
      year: year ? parseInt(year) : null,
      result: result || null,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });

    if (!data) {
      return res.status(404).json({
        error: `No data found for company: ${slug}`,
      });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllCompanies,
  getCompanyPattern,
  getCompanyExperiences,
};
