// src/config/redis.js

const Redis = require("ioredis");

// Create a Redis client
// ioredis automatically reconnects if Redis goes down
// and queues commands until connection is restored
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,

  // if Redis is down, retry connecting every 2 seconds
  // instead of crashing the whole app
  retryStrategy(times) {
    const delay = Math.min(times * 2000, 10000);
    // times = how many retries so far
    // we wait 2s, 4s, 6s... up to max 10s between retries
    return delay;
  },
});

// Log when connected successfully
redis.on("connect", () => {
  console.log("✅ Connected to Redis");
});

// Log errors but don't crash the app
// This is important — if Redis goes down, the rest of the
// app should keep working (just slower, hitting PostgreSQL)
redis.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});

module.exports = redis;
