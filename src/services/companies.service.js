// src/services/companies.service.js

const pool = require("../config/db");
const redis = require("../config/redis");

// How long to keep cached data before it expires
// 3600 seconds = 1 hour
// After 1 hour Redis automatically deletes the cached result
// and the next request recalculates from PostgreSQL
const CACHE_TTL = 3600;

// ─────────────────────────────────────────────────────
// Get aggregated pattern summary for a company
// WITH Redis caching — checks cache first, hits DB only if needed

async function getCompanyPattern(slug, filters = {}) {
  const { year } = filters;

  // Build a unique cache key for this specific request
  // "pattern:amazon:2024" and "pattern:amazon:all" are different
  // cached results — we never mix them up
  const cacheKey = `pattern:${slug}:${year || "all"}`;

  // Step 1 — check Redis first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`Cache HIT for ${cacheKey}`);
      // JSON.parse because Redis stores strings, not objects
      return JSON.parse(cached);
    }
    console.log(`Cache MISS for ${cacheKey}`);
  } catch (redisErr) {
    // if Redis fails, log it but keep going
    // we fall through to PostgreSQL automatically
    // this is "graceful degradation" — Redis down doesn't crash the app
    console.error("Redis error, falling back to DB:", redisErr.message);
  }

  // Step 2 — Redis had nothing, query PostgreSQL
  const companyResult = await pool.query(
    "SELECT id, name, slug FROM companies WHERE slug = $1",
    [slug],
  );

  if (companyResult.rows.length === 0) {
    return null;
  }

  const company = companyResult.rows[0];

  let yearFilter = "";
  let queryParams = [company.id];

  if (year) {
    yearFilter = "AND e.year = $2";
    queryParams.push(year);
  }

  const totalResult = await pool.query(
    `SELECT COUNT(*) as total 
     FROM experiences e 
     WHERE e.company_id = $1 ${yearFilter}`,
    queryParams,
  );

  const totalExperiences = parseInt(totalResult.rows[0].total);

  const confidence =
    totalExperiences >= 10 ? "High"
    : totalExperiences >= 5 ? "Medium"
    : "Low";

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

  const roundsResult = await pool.query(
    `SELECT ROUND(AVG(total_rounds)) as avg_rounds
     FROM experiences e
     WHERE e.company_id = $1 
     AND total_rounds IS NOT NULL ${yearFilter}`,
    queryParams,
  );

  const resultsResult = await pool.query(
    `SELECT result, COUNT(*) as count
     FROM experiences e
     WHERE e.company_id = $1 ${yearFilter}
     GROUP BY result`,
    queryParams,
  );

  const resultBreakdown = {};
  for (const row of resultsResult.rows) {
    resultBreakdown[row.result] = parseInt(row.count);
  }

  const pattern = {
    company: company.name,
    slug: company.slug,
    based_on: totalExperiences,
    confidence,
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

  // Step 3 — save result in Redis for next time
  // JSON.stringify because Redis only stores strings
  try {
    await redis.set(cacheKey, JSON.stringify(pattern), "EX", CACHE_TTL);
    console.log(`Cached ${cacheKey} for ${CACHE_TTL} seconds`);
  } catch (redisErr) {
    // if caching fails, it's not critical — just log and move on
    console.error("Failed to cache result:", redisErr.message);
  }

  return pattern;
}

// ─────────────────────────────────────────────────────
// Invalidate cache for a company
// Called whenever a new experience is submitted for that company
// so the next request gets fresh data from PostgreSQL

async function invalidateCompanyCache(slug) {
  try {
    // Delete all cached patterns for this company
    // both "all years" and any specific year caches
    const keys = await redis.keys(`pattern:${slug}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cache invalidated for ${slug}`);
    }
  } catch (redisErr) {
    console.error("Failed to invalidate cache:", redisErr.message);
  }
}

// ─────────────────────────────────────────────────────
// Get list of all companies — with caching

async function getAllCompanies() {
  const cacheKey = "companies:all";

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error("Redis error:", err.message);
  }

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

  const companies = result.rows.map((row) => ({
    name: row.name,
    slug: row.slug,
    total_experiences: parseInt(row.total_experiences),
  }));

  try {
    await redis.set(cacheKey, JSON.stringify(companies), "EX", CACHE_TTL);
  } catch (err) {
    console.error("Failed to cache:", err.message);
  }

  return companies;
}

// ─────────────────────────────────────────────────────
// Get individual experiences list — no caching needed
// because this changes frequently and supports many filter combos

async function getCompanyExperiences(slug, filters = {}) {
  const { year, result, page = 1, limit = 10 } = filters;
  const offset = (page - 1) * limit;

  const companyResult = await pool.query(
    "SELECT id, name FROM companies WHERE slug = $1",
    [slug],
  );

  if (companyResult.rows.length === 0) return null;

  const company = companyResult.rows[0];

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
  invalidateCompanyCache,
};
