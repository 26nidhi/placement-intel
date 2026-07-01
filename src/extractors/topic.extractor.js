// src/extractors/topic.extractor.js

const TOPICS_MAP = require("../config/topics.map");

// Main function — takes raw text, returns array of matched topic names
// Example:
//   Input:  "they asked me to find shortest path and reverse a linked list"
//   Output: ["Graphs", "Linked List"]

function extractTopics(text) {
  if (!text || typeof text !== "string") {
    return []; // if no text given, return empty array
  }

  // lowercase everything so "BFS" and "bfs" both match
  const lowerText = text.toLowerCase();

  const matchedTopics = new Set();
  // We use a Set instead of an array because the same topic
  // might match multiple keywords — e.g. "bfs" and "shortest path"
  // both map to "Graphs". A Set automatically removes duplicates.

  // Loop through every topic in our map
  for (const [topicName, keywords] of Object.entries(TOPICS_MAP)) {
    // Loop through every keyword for this topic
    for (const keyword of keywords) {
      // Check if this keyword exists anywhere in the text
      if (lowerText.includes(keyword)) {
        matchedTopics.add(topicName); // add topic to results
        break; // no need to check other keywords for this topic
        // once we found one match, the topic is confirmed
      }
    }
  }

  // Convert Set back to Array before returning
  return Array.from(matchedTopics);
}

// Secondary function — extracts number of rounds from text
// Looks for patterns like "3 rounds", "4 rounds", "five rounds"
function extractRoundCount(text) {
  if (!text || typeof text !== "string") return null;

  const lowerText = text.toLowerCase();

  // Match patterns like "3 rounds", "4 rounds", "had 5 rounds"
  const numberMatch = lowerText.match(/(\d+)\s*rounds?/);
  if (numberMatch) {
    return parseInt(numberMatch[1]);
  }

  // Match written numbers — "three rounds", "four rounds"
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

  return null; // couldn't find round count
}

// Third function — extracts CTC from text
// Looks for patterns like "18 LPA", "22lpa", "offered 30 LPA"
function extractCTC(text) {
  if (!text || typeof text !== "string") return null;

  // Match patterns like "22 LPA", "18LPA", "22.5 LPA"
  const ctcMatch = text.match(/(\d+\.?\d*)\s*lpa/i);
  if (ctcMatch) {
    return `${ctcMatch[1]} LPA`;
  }

  return null;
}

// Fourth function — extracts result from text
// Looks for "selected", "rejected", "offered" etc.
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

// Export all 4 functions so other files can use them
module.exports = {
  extractTopics,
  extractRoundCount,
  extractCTC,
  extractResult,
};
