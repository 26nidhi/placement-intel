// src/services/experiences.service.js

const pool = require("../config/db");

// ─────────────────────────────────────────────────────
// Helper function: convert a company name into a URL-friendly slug
// "Tata Consultancy Services" → "tata-consultancy-services"
// We need this because our companies table has a UNIQUE slug column
function createSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // replace spaces/symbols with -
    .replace(/(^-|-$)/g, ""); // remove leading/trailing -
}

// ─────────────────────────────────────────────────────
// Find a company by name, or create it if it doesn't exist yet.
// This is the "find or create" pattern I mentioned in Module 2 —
// it prevents duplicate company rows when two different students
// submit experiences for "Amazon" separately.
async function findOrCreateCompany(companyName) {
  const slug = createSlug(companyName);

  // Step 1 — try to find the company first
  const existing = await pool.query(
    "SELECT id FROM companies WHERE slug = $1",
    [slug],
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id; // company already exists, return its id
  }

  // Step 2 — doesn't exist, so create it
  const created = await pool.query(
    "INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id",
    [companyName, slug],
  );

  return created.rows[0].id;
}

// ─────────────────────────────────────────────────────
// Find a topic by name, or create it if it doesn't exist yet.
// Same "find or create" pattern as companies above.
async function findOrCreateTopic(topicName) {
  const slug = createSlug(topicName);

  const existing = await pool.query("SELECT id FROM topics WHERE slug = $1", [
    slug,
  ]);

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const created = await pool.query(
    "INSERT INTO topics (name, slug) VALUES ($1, $2) RETURNING id",
    [topicName, slug],
  );

  return created.rows[0].id;
}

// ─────────────────────────────────────────────────────
// Main function — saves a complete interview experience
// submitted by a student, along with its topics.
async function submitExperience(data) {
  const {
    company, // "Amazon"
    title, // "Amazon SDE-1 Interview Aug 2024"
    year,
    totalRounds,
    result, // "selected" | "rejected" | "unknown"
    ctc,
    processDuration,
    rawText,
    tips,
    topics, // ["Dynamic Programming", "Trees", "Arrays"]
  } = data;

  // Step 1 — find or create the company, get its id
  const companyId = await findOrCreateCompany(company);

  // Step 2 — insert the experience itself
  const experienceResult = await pool.query(
    `INSERT INTO experiences 
      (company_id, title, source, year, total_rounds, result, ctc, process_duration, raw_text, tips)
     VALUES ($1, $2, 'manual', $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      companyId,
      title,
      year,
      totalRounds,
      result,
      ctc,
      processDuration,
      rawText,
      tips,
    ],
  );

  const experienceId = experienceResult.rows[0].id;

  // Step 3 — link each topic to this experience
  // We loop through the topics array and insert one row per topic
  // into the experience_topics linking table
  if (topics && topics.length > 0) {
    for (const topicName of topics) {
      const topicId = await findOrCreateTopic(topicName);

      await pool.query(
        `INSERT INTO experience_topics (experience_id, topic_id)
         VALUES ($1, $2)
         ON CONFLICT (experience_id, topic_id) DO NOTHING`,
        [experienceId, topicId],
      );
      // ON CONFLICT DO NOTHING means: if this exact link already
      // exists, silently skip it instead of throwing an error.
      // This uses the UNIQUE constraint we set up in Module 2.
    }
  }
  // invalidate the cached pattern for this company
  // so next request gets fresh aggregated data
  const { invalidateCompanyCache } = require("./companies.service");
  const companySlug = createSlug(company);
  await invalidateCompanyCache(companySlug);

  return { id: experienceId, company, title };
}

module.exports = {
  submitExperience,
};
