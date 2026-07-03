// server.js

// import the configured Express app
const app = require("./app");
// import redis so connection is established when server starts
require('./src/config/redis');

// read PORT from .env file — if not set, default to 3000
const PORT = process.env.PORT || 3000;

// start the server and listen for incoming requests
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
