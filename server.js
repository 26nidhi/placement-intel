// server.js

const app = require("./app");

// initialize Redis connection when server starts
require("./src/config/redis");

// import and start the cron job scheduler
const { startScraperJob } = require("./src/jobs/scraper.job");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV}`);

  // start the cron job after server is listening
  // this registers the weekly schedule
  startScraperJob();
});
