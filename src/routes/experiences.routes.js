// src/routes/experiences.routes.js

const express = require("express");
const router = express.Router();

const experiencesController = require("../controllers/experiences.controller");

// POST /api/experiences/submit
// router.post defines: "when a POST request hits this path,
// run this controller function"
//
// Notice this file contains ZERO logic — no validation,
// no database calls. It only maps a URL to a controller.
// This is "Rule 2" from our architecture: routes never
// contain logic.
router.post("/submit", experiencesController.submitExperience);

module.exports = router;
