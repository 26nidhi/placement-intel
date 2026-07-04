// src/scrapers/gfg.scraper.js

const puppeteer = require("puppeteer");
const BaseScraper = require("./base.scraper");
const {
  extractTopics,
  extractRoundCount,
  extractCTC,
  extractResult,
} = require("../extractors/topic.extractor");
const experiencesService = require("../services/experiences.service");

class GFGScraper extends BaseScraper {
  constructor() {
    // pass "gfg" as source to base class
    // every experience saved by this scraper will have source="gfg"
    super("gfg");
  }

  // ─────────────────────────────────────────────────────
  // Main entry point — scrapes experiences for one company
  // Usage: await scraper.scrape("Amazon")

  async scrape(companyName) {
    console.log(`\n🔍 Starting GFG scrape for: ${companyName}`);

    const companySlug = companyName.toLowerCase().trim().replace(/\s+/g, "-");

    // Updated URL format GFG currently uses
    const searchUrl = `https://www.geeksforgeeks.org/tag/${companySlug}/`;

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: false, // set to false so you can SEE what the browser is doing
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });

      const page = await browser.newPage();

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      console.log(`📄 Visiting: ${searchUrl}`);
      await page.goto(searchUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait extra 3 seconds for dynamic content to load
      await this.delay(3000);

      // Take a screenshot so we can see what GFG actually shows
      await page.screenshot({ path: "gfg-debug.png", fullPage: false });
      console.log(
        "Screenshot saved as gfg-debug.png — open it to see what GFG shows",
      );

      const postLinks = await this.getPostLinks(page);
      console.log(`Found ${postLinks.length} experience posts`);

      if (postLinks.length === 0) {
        console.log(
          "Still 0 posts — check gfg-debug.png to see what the page looks like",
        );
        await browser.close();
        return [];
      }

      const savedExperiences = [];

      for (const link of postLinks.slice(0, 10)) {
        try {
          console.log(`\n📖 Reading: ${link}`);
          await page.goto(link, {
            waitUntil: "networkidle2",
            timeout: 30000,
          });

          const data = await this.parse(page, link);

          if (data) {
            const saved = await this.save(data, companyName);
            if (saved) savedExperiences.push(saved);
          }
        } catch (postError) {
          console.error(`Failed to scrape post ${link}:`, postError.message);
        }

        await this.randomDelay(3000, 6000);
      }

      console.log(
        `\n✅ GFG scrape complete. Saved ${savedExperiences.length} experiences.`,
      );
      return savedExperiences;
    } catch (error) {
      console.error("GFG scraper error:", error.message);
      return [];
    } finally {
      if (browser) await browser.close();
    }
  }

  // ─────────────────────────────────────────────────────
  // Get all post links from the company's GFG page

  async getPostLinks(page) {
    try {
      // First let's see what URL we actually landed on
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);

      // Wait for page content to load
      await page.waitForSelector("a", { timeout: 10000 });

      const links = await page.evaluate(() => {
        const anchors = document.querySelectorAll("a[href]");
        const postLinks = [];

        for (const anchor of anchors) {
          const href = anchor.href || "";
          // collect ALL geeksforgeeks links so we can see what's there
          if (href.includes("geeksforgeeks.org")) {
            postLinks.push(href);
          }
        }

        return [...new Set(postLinks)];
      });

      // log all links found so we can see GFG's actual structure
      console.log("All GFG links found on page:");
      links.slice(0, 20).forEach((l) => console.log(" ", l));

      // now filter for interview experience posts
      const experienceLinks = links.filter(
        (href) =>
          href.includes("interview-experience") &&
          !href.includes("/company/") &&
          !href.includes("/tag/") &&
          !href.includes("/category/"),
      );

      return experienceLinks;
    } catch (error) {
      console.error("Error getting post links:", error.message);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────
  // Extract structured data from one GFG post page

  async parse(page, url) {
    try {
      // Extract the raw text content and title from the page
      const rawData = await page.evaluate(() => {
        // Get the article title
        const titleEl = document.querySelector("h1, .article-title, h2");
        const title = titleEl ? titleEl.innerText.trim() : "";

        // Get the main article content
        // GFG uses different selectors — we try multiple
        const contentEl = document.querySelector(
          ".article-body, .entry-content, article, .content",
        );
        const content = contentEl ? contentEl.innerText.trim() : "";

        return { title, content };
      });

      if (!rawData.content || rawData.content.length < 100) {
        // content too short — probably a login wall or empty page
        console.log("Content too short, skipping this post");
        return null;
      }

      // Run our extractors from Module 4 on the raw content
      const topics = extractTopics(rawData.content);
      const totalRounds = extractRoundCount(rawData.content);
      const ctc = extractCTC(rawData.content);
      const result = extractResult(rawData.content);

      // Try to extract year from URL or content
      // GFG URLs often contain the year: /amazon-interview-experience-2024/
      const yearMatch = url.match(/20(2[0-9]|1[0-9])/);
      const year =
        yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

      return {
        title: rawData.title || "GFG Interview Experience",
        rawText: rawData.content.substring(0, 5000), // store first 5000 chars only
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
        source: "gfg",
        sourceUrl: data.sourceUrl,
      });

      console.log(`💾 Saved: ${data.title}`);
      return saved;
    } catch (error) {
      // duplicate experience — already in database, skip it
      if (error.code === "23505") {
        console.log("Duplicate experience, skipping");
        return null;
      }
      console.error("Save error:", error.message);
      return null;
    }
  }
}

module.exports = GFGScraper;
