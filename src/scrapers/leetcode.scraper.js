// src/scrapers/leetcode.scraper.js

const puppeteer = require("puppeteer");
const BaseScraper = require("./base.scraper");
const {
  extractTopics,
  extractRoundCount,
  extractCTC,
  extractResult,
} = require("../extractors/topic.extractor");
const experiencesService = require("../services/experiences.service");

class LeetCodeScraper extends BaseScraper {
  constructor() {
    // pass "leetcode" as source to base class
    super("leetcode");
  }

  // ─────────────────────────────────────────────────────
  // Main entry point — scrapes LeetCode Discuss for one company

  async scrape(companyName) {
    console.log(`\n🔍 Starting LeetCode scrape for: ${companyName}`);

    const companySlug = companyName.toLowerCase().trim().replace(/\s+/g, "-");

    // LeetCode discuss URL for interview experiences
    // LeetCode company filter requires login
    // Instead we search the general discuss section for company experiences
    const searchUrl = `https://leetcode.com/discuss/interview-experience/`;

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: false,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-blink-features=AutomationControlled",
          // hides the fact that we're using automation
          // LeetCode is stricter about bot detection than GFG
        ],
      });

      const page = await browser.newPage();

      // More realistic browser fingerprint for LeetCode
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      // Set extra headers to look more like a real browser
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      });

      console.log(`📄 Visiting: ${searchUrl}`);
      await page.goto(searchUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // LeetCode loads content slower than GFG
      // wait extra 5 seconds for posts to appear
      await this.delay(5000);

      const postLinks = await this.getPostLinks(page, companyName);
      console.log(`Found ${postLinks.length} experience posts`);

      if (postLinks.length === 0) {
        console.log("No posts found on LeetCode for this company");
        await browser.close();
        return [];
      }

      const savedExperiences = [];

      for (const link of postLinks.slice(0, 8)) {
        // limit to 8 posts per run for LeetCode
        // LeetCode is stricter — fewer requests = safer
        try {
          console.log(`\n📖 Reading: ${link}`);

          await page.goto(link, {
            waitUntil: "networkidle2",
            timeout: 30000,
          });

          // wait for content to render
          await this.delay(3000);

          const data = await this.parse(page, link);

          if (data) {
            const saved = await this.save(data, companyName);
            if (saved) savedExperiences.push(saved);
          }
        } catch (postError) {
          console.error(`Failed to scrape post ${link}:`, postError.message);
        }

        // longer delays for LeetCode — 5 to 10 seconds
        await this.randomDelay(5000, 10000);
      }

      console.log(
        `\n✅ LeetCode scrape complete. Saved ${savedExperiences.length} experiences.`,
      );
      return savedExperiences;
    } catch (error) {
      console.error("LeetCode scraper error:", error.message);
      return [];
    } finally {
      if (browser) await browser.close();
    }
  }

  // ─────────────────────────────────────────────────────
  // Get all post links from LeetCode Discuss page

  async getPostLinks(page, companyName) {
    try {
      await page.waitForSelector("a", { timeout: 15000 });

      const companyLower = companyName.toLowerCase();

      const links = await page.evaluate((companyLower) => {
        const anchors = document.querySelectorAll("a[href]");
        const postLinks = [];

        for (const anchor of anchors) {
          const href = anchor.href || "";
          const text = anchor.innerText?.toLowerCase() || "";

          // LeetCode now uses /discuss/post/ URL format
          // Only grab posts that mention the company name
          if (
            href.includes("leetcode.com/discuss/post/") &&
            (text.includes(companyLower) || href.includes(companyLower))
          ) {
            postLinks.push(href);
          }
        }

        return [...new Set(postLinks)];
      }, companyLower);

      console.log(`Found ${links.length} matching posts for ${companyName}`);
      return links;
    } catch (error) {
      console.error("Error getting LeetCode post links:", error.message);
      return [];
    }
  }
  // ─────────────────────────────────────────────────────
  // Extract structured data from one LeetCode post

  async parse(page, url) {
    try {
      const rawData = await page.evaluate(() => {
        // LeetCode discuss post title
        const titleEl = document.querySelector(
          'h1, .discuss-markdown-container h1, [class*="title"]',
        );
        const title = titleEl ? titleEl.innerText.trim() : "";

        // LeetCode discuss post content
        // the main post body uses these selectors
        const contentEl = document.querySelector(
          '.discuss-markdown-container, .content__u3I1, [class*="content"]',
        );
        const content = contentEl ? contentEl.innerText.trim() : "";

        return { title, content };
      });

      if (!rawData.content || rawData.content.length < 100) {
        console.log("Content too short or behind login wall, skipping");
        return null;
      }

      // run extractors from Module 4 on the content
      const topics = extractTopics(rawData.content);
      const totalRounds = extractRoundCount(rawData.content);
      const ctc = extractCTC(rawData.content);
      const result = extractResult(rawData.content);

      // extract year from URL or content
      const yearMatch = url.match(/20(2[0-9]|1[0-9])/);
      const year =
        yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

      return {
        title: rawData.title || "LeetCode Interview Experience",
        rawText: rawData.content.substring(0, 5000),
        topics,
        totalRounds,
        ctc,
        result,
        year,
        sourceUrl: url,
      };
    } catch (error) {
      console.error("Parse error:", error.message);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────
  // Save extracted data to database

  async save(data, companyName) {
    try {
      const saved = await experiencesService.submitExperience({
        company: companyName,
        title: data.title,
        year: data.year,
        totalRounds: data.totalRounds,
        result: data.result,
        ctc: data.ctc,
        processDuration: null,
        rawText: data.rawText,
        tips: null,
        topics: data.topics,
        source: "leetcode",
        sourceUrl: data.sourceUrl,
      });

      console.log(`💾 Saved: ${data.title}`);
      return saved;
    } catch (error) {
      if (error.code === "23505") {
        console.log("Duplicate experience, skipping");
        return null;
      }
      console.error("Save error:", error.message);
      return null;
    }
  }
}

module.exports = LeetCodeScraper;
