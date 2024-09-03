const { configDotenv } = require("dotenv"); // Load environment variables
const redis = require("redis");
const { promisify } = require("util");

// Load environment variables (ensure this line is not missing if using environment variables)
configDotenv();

// Create a Redis client with legacy mode enabled
const redisClient = redis.createClient({
  legacyMode: true,
  socket: {
    host: process.env.REDIS_CLIENT_HOST,
    port: process.env.REDIS_CLIENT_PORT,
  },
});

// Handle errors
redisClient.on("error", function (error) {
  console.log(`REDIS CLIENT FAILED: ${error}`);
});

// Explicitly connect to Redis (required for the latest redis client in legacyMode)
redisClient.connect().catch((err) => {
  console.error("Failed to connect to Redis:", err);
});

// Promisify Redis commands to use async/await
const getAsync = promisify(redisClient.get).bind(redisClient);
const keysAsync = promisify(redisClient.keys).bind(redisClient);
const smembersAsync = promisify(redisClient.smembers).bind(redisClient);

// Handle process exit to properly close the Redis client
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  try {
    await redisClient.quit(); // Properly close the client
  } catch (error) {
    console.error("Error shutting down Redis client:", error);
  }
  process.exit(0);
});

module.exports = {
  redisClient,
  getAsync,
  keysAsync,
  smembersAsync,
};
