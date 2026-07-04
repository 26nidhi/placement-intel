// src/scrapers/base.scraper.js

// This is the base class that every scraper extends.
// It defines the structure every scraper must follow:
//   - scrape()  → main entry point, runs the full scrape
//   - parse()   → extracts structured data from raw HTML
//   - save()    → saves extracted data to database
//
// Why a base class?
// Because when we add LeetCode scraper in Module 8,
// it follows the exact same structure. Adding a new scraper
// means extending this class and filling in the methods.
// Zero changes to existing code anywhere else.

class BaseScraper {
  constructor(source) {
    // source is the name of this scraper — "gfg" or "leetcode"
    // stored with every experience so we know where it came from
    this.source = source;

    // delay between requests in milliseconds
    // 3000ms = 3 seconds — gives GFG's servers time to breathe
    // scraping too fast looks like a bot attack and gets you blocked
    this.delayMs = 3000;
  }

  // Helper — pauses execution for a given number of milliseconds
  // Used between page visits to avoid hammering servers
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Helper — generates a random delay between min and max ms
  // Random delays look more human-like than fixed 3000ms every time
  async randomDelay(min = 2000, max = 5000) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`Waiting ${ms}ms before next request...`);
    await this.delay(ms);
  }

  // These 3 methods MUST be implemented by every scraper
  // that extends this base class.
  // If a scraper forgets to implement one, it throws a clear error
  // instead of failing silently with a confusing message.

  async scrape(company) {
    throw new Error(`${this.source} scraper must implement scrape()`);
  }

  async parse(page, url) {
    throw new Error(`${this.source} scraper must implement parse()`);
  }

  async save(data) {
    throw new Error(`${this.source} scraper must implement save()`);
  }
}

module.exports = BaseScraper;
