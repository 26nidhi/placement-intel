// src/controllers/experiences.controller.js

const experiencesService = require("../services/experiences.service");

// ─────────────────────────────────────────────────────
// Handles POST /api/experiences/submit
// This function's job is simple:
// 1. Validate the incoming data is not garbage
// 2. Call the service to do the actual work
// 3. Send back a clean response
//
// Notice this function has ZERO database code in it.
// All database logic lives in the service file.
// This separation is why we can change how data is stored
// later without touching this controller at all.
async function submitExperience(req, res, next) {
  try {
    const { company, title, topics } = req.body;

    // ─── Basic validation ───────────────────────────
    // We reject the request early if required fields are missing.
    // This prevents garbage data from ever reaching our database.
    if (!company || typeof company !== "string") {
      return res.status(400).json({
        error: "Company name is required and must be text",
      });
    }

    if (!title || typeof title !== "string") {
      return res.status(400).json({
        error: "Title is required and must be text",
      });
    }

    if (topics && !Array.isArray(topics)) {
      return res.status(400).json({
        error: 'Topics must be a list, e.g. ["Dynamic Programming", "Trees"]',
      });
    }

    // ─── Call the service to save it ────────────────
    const result = await experiencesService.submitExperience(req.body);

    // 201 means "Created" — the correct status code for
    // successfully creating a new resource via POST
    res.status(201).json({
      message: "Experience submitted successfully",
      data: result,
    });
  } catch (error) {
    // we don't handle the error here ourselves —
    // we pass it to Express's error handler middleware
    // (the one we wrote in app.js back in Module 1)
    next(error);
  }
}

module.exports = {
  submitExperience,
};
