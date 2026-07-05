// src/jobs/scraper.job.js

const cron = require("node-cron");
const GFGScraper = require("../scrapers/gfg.scraper");
const LeetCodeScraper = require("../scrapers/leetcode.scraper");

// List of companies to scrape every week
// Add more companies here as your database grows
const COMPANIES_TO_SCRAPE = [
  "Amazon",
  "Google",
  "Microsoft",
  "Flipkart",
  "Zepto",
  "Swiggy",
  "Zomato",
  "CRED",
  "Razorpay",
  "Paytm",
];

// ─────────────────────────────────────────────────────
// Main scraping function — runs both scrapers for all companies

async function runScrapers() {
  console.log("\n🕐 Weekly scrape started at:", new Date().toISOString());

  const gfgScraper = new GFGScraper();
  const leetcodeScraper = new LeetCodeScraper();

  let totalSaved = 0;

  for (const company of COMPANIES_TO_SCRAPE) {
    console.log(`\n📋 Scraping ${company}...`);

    try {
      // scrape GFG for this company
      const gfgResults = await gfgScraper.scrape(company);
      totalSaved += gfgResults.length;
      console.log(`GFG: saved ${gfgResults.length} for ${company}`);
    } catch (err) {
      // if GFG scrape fails for one company, log and continue
      // never let one company failure stop the entire job
      console.error(`GFG scrape failed for ${company}:`, err.message);
    }

    // wait 10 seconds between companies
    // gives GFG time to breathe between batches
    await new Promise((resolve) => setTimeout(resolve, 10000));

    try {
      // scrape LeetCode for this company
      const leetcodeResults = await leetcodeScraper.scrape(company);
      totalSaved += leetcodeResults.length;
      console.log(`LeetCode: saved ${leetcodeResults.length} for ${company}`);
    } catch (err) {
      console.error(`LeetCode scrape failed for ${company}:`, err.message);
    }

    // wait 15 seconds before moving to next company
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }

  console.log(`\n✅ Weekly scrape complete. Total saved: ${totalSaved}`);
  console.log("Next scrape scheduled for next Sunday at 2 AM\n");
}

// ─────────────────────────────────────────────────────
// Schedule the cron job
// Cron expression: '0 2 * * 0'
// means: minute=0, hour=2, any day of month, any month, Sunday(0)
// = every Sunday at 2:00 AM

function startScraperJob() {
  console.log("⏰ Scraper cron job scheduled — runs every Sunday at 2 AM");

  cron.schedule("0 2 * * 0", () => {
    runScrapers().catch((err) => {
      // catch any unhandled error so cron job doesn't die permanently
      console.error("Weekly scraper job failed:", err.message);
    });
  });
}

// ─────────────────────────────────────────────────────
// Export both functions
// startScraperJob — called by server.js to register the schedule
// runScrapers — exported so we can trigger it manually via API if needed

module.exports = {
  startScraperJob,
  runScrapers,
};
