// src/extractors/topic.extractor.js

const TOPICS_MAP = require("../config/topics.map");

// Main function — takes raw text, returns array of matched topic names
function extractTopics(text) {
  if (!text || typeof text !== "string") {
    return [];
  }

  const lowerText = text.toLowerCase();
  const matchedTopics = new Set();

  for (const [topicName, keywords] of Object.entries(TOPICS_MAP)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        matchedTopics.add(topicName);
        break;
      }
    }
  }

  return Array.from(matchedTopics);
}

// Extracts number of rounds from text
function extractRoundCount(text) {
  if (!text || typeof text !== "string") return null;

  const lowerText = text.toLowerCase();

  // match single digit round counts only — prevents year being picked up
  const numberMatch = lowerText.match(/\b([1-9])\s*rounds?\b/);
  if (numberMatch) {
    const num = parseInt(numberMatch[1]);
    if (num <= 10) return num;
  }

  // match written numbers
  const writtenNumbers = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
  };

  for (const [word, num] of Object.entries(writtenNumbers)) {
    if (lowerText.includes(`${word} round`)) {
      return num;
    }
  }

  return null;
}

// Extracts CTC from text
function extractCTC(text) {
  if (!text || typeof text !== "string") return null;

  const ctcMatch = text.match(/(\d+\.?\d*)\s*lpa/i);
  if (ctcMatch) {
    return `${ctcMatch[1]} LPA`;
  }

  return null;
}

// Extracts result from text
function extractResult(text) {
  if (!text || typeof text !== "string") return "unknown";

  const lowerText = text.toLowerCase();

  if (
    lowerText.includes("selected") ||
    lowerText.includes("got the offer") ||
    lowerText.includes("received offer") ||
    lowerText.includes("got offer") ||
    lowerText.includes("was hired") ||
    lowerText.includes("got hired")
  ) {
    return "selected";
  }

  if (
    lowerText.includes("rejected") ||
    lowerText.includes("not selected") ||
    lowerText.includes("didn't make it") ||
    lowerText.includes("did not make it") ||
    lowerText.includes("wasn't selected")
  ) {
    return "rejected";
  }

  return "unknown";
}

module.exports = {
  extractTopics,
  extractRoundCount,
  extractCTC,
  extractResult,
};
