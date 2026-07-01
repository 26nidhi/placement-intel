// src/services/companies.service.js

const pool = require("../config/db");

// ─────────────────────────────────────────────────────
// Get aggregated pattern summary for a company
// This is the main query that makes this project impressive.
// It answers: "What does Amazon usually ask?"

async function getCompanyPattern(slug, filters = {}) {
  const { year } = filters;

  // Step 1 — find the company by slug
  const companyResult = await pool.query(
    "SELECT id, name, slug FROM companies WHERE slug = $1",
    [slug],
  );

  if (companyResult.rows.length === 0) {
    return null; // company not found
  }

  const company = companyResult.rows[0];

  // Step 2 — build year filter dynamically
  // If user passed ?year=2024, we add that to the WHERE clause
  // If not, we query all years
  let yearFilter = "";
  let queryParams = [company.id];

  if (year) {
    yearFilter = "AND e.year = $2";
    queryParams.push(year);
  }

  // Step 3 — count total experiences for this company
  const totalResult = await pool.query(
    `SELECT COUNT(*) as total 
     FROM experiences e 
     WHERE e.company_id = $1 ${yearFilter}`,
    queryParams,
  );

  const totalExperiences = parseInt(totalResult.rows[0].total);

  // If we have less than 10 experiences, warn the user
  // that patterns may not be reliable
  const confidence =
    totalExperiences >= 10 ? "High"
    : totalExperiences >= 5 ? "Medium"
    : "Low";

  // Step 4 — get top topics with frequency
  // This query:
  // 1. JOINs experiences → experience_topics → topics
  // 2. Counts how many experiences mention each topic
  // 3. Calculates percentage: (count / total) * 100
  // 4. Orders by frequency descending
  const topicsResult = await pool.query(
    `SELECT 
       t.name as topic,
       COUNT(DISTINCT et.experience_id) as mention_count,
       ROUND(
         COUNT(DISTINCT et.experience_id) * 100.0 / $2
       ) as frequency_percent
     FROM experiences e
     JOIN experience_topics et ON et.experience_id = e.id
     JOIN topics t ON t.id = et.topic_id
     WHERE e.company_id = $1 ${yearFilter}
     GROUP BY t.name
     ORDER BY mention_count DESC
     LIMIT 10`,
    [company.id, totalExperiences, ...(year ? [year] : [])],
  );

  // Step 5 — get average rounds
  const roundsResult = await pool.query(
    `SELECT ROUND(AVG(total_rounds)) as avg_rounds
     FROM experiences e
     WHERE e.company_id = $1 
     AND total_rounds IS NOT NULL ${yearFilter}`,
    queryParams,
  );

  // Step 6 — get result breakdown
  // How many got selected vs rejected
  const resultsResult = await pool.query(
    `SELECT result, COUNT(*) as count
     FROM experiences e
     WHERE e.company_id = $1 ${yearFilter}
     GROUP BY result`,
    queryParams,
  );

  // Convert result rows into a clean object
  // { selected: 5, rejected: 3, unknown: 2 }
  const resultBreakdown = {};
  for (const row of resultsResult.rows) {
    resultBreakdown[row.result] = parseInt(row.count);
  }

  // Step 7 — assemble the final response
  return {
    company: company.name,
    slug: company.slug,
    based_on: totalExperiences,
    confidence,
    // show warning if data is too thin to trust
    warning:
      totalExperiences < 10 ?
        `Only ${totalExperiences} experience(s) found. Patterns may not be reliable.`
      : null,
    avg_rounds:
      roundsResult.rows[0].avg_rounds ?
        parseInt(roundsResult.rows[0].avg_rounds)
      : null,
    top_topics: topicsResult.rows.map((row) => ({
      topic: row.topic,
      frequency: `${row.frequency_percent}%`,
      mentioned_in: parseInt(row.mention_count),
    })),
    results: resultBreakdown,
    filters_applied: { year: year || "all" },
  };
}

// ─────────────────────────────────────────────────────
// Get list of all companies we have data for
// Useful for a "browse all companies" endpoint

async function getAllCompanies() {
  const result = await pool.query(
    `SELECT 
       c.name,
       c.slug,
       COUNT(e.id) as total_experiences
     FROM companies c
     LEFT JOIN experiences e ON e.company_id = c.id
     GROUP BY c.id, c.name, c.slug
     ORDER BY total_experiences DESC`,
  );

  return result.rows.map((row) => ({
    name: row.name,
    slug: row.slug,
    total_experiences: parseInt(row.total_experiences),
  }));
}

// ─────────────────────────────────────────────────────
// Get individual experiences list for a company
// With filters: year, result, page

async function getCompanyExperiences(slug, filters = {}) {
  const { year, result, page = 1, limit = 10 } = filters;
  const offset = (page - 1) * limit;

  // find company first
  const companyResult = await pool.query(
    "SELECT id, name FROM companies WHERE slug = $1",
    [slug],
  );

  if (companyResult.rows.length === 0) return null;

  const company = companyResult.rows[0];

  // build dynamic filters
  let conditions = ["e.company_id = $1"];
  let params = [company.id];
  let paramCount = 1;

  if (year) {
    paramCount++;
    conditions.push(`e.year = $${paramCount}`);
    params.push(year);
  }

  if (result) {
    paramCount++;
    conditions.push(`e.result = $${paramCount}`);
    params.push(result);
  }

  const whereClause = conditions.join(" AND ");

  const experiencesResult = await pool.query(
    `SELECT 
       e.id, e.title, e.year, e.total_rounds,
       e.result, e.ctc, e.source, e.source_url,
       e.process_duration, e.tips
     FROM experiences e
     WHERE ${whereClause}
     ORDER BY e.year DESC, e.id DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    [...params, limit, offset],
  );

  // for each experience, also get its topics
  const experiences = [];
  for (const exp of experiencesResult.rows) {
    const topicsResult = await pool.query(
      `SELECT t.name FROM topics t
       JOIN experience_topics et ON et.topic_id = t.id
       WHERE et.experience_id = $1`,
      [exp.id],
    );

    experiences.push({
      ...exp,
      topics: topicsResult.rows.map((t) => t.name),
    });
  }

  return {
    company: company.name,
    total: experiences.length,
    page: parseInt(page),
    experiences,
  };
}

module.exports = {
  getCompanyPattern,
  getAllCompanies,
  getCompanyExperiences,
};
