const mongoose = require("mongoose");
const dotenv = require("dotenv");
const logger = require("./logger.config");
dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.DB_URL);
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Error while connecting database", error);
    process.exit(1);
  }
}

module.exports = { connectDB };
