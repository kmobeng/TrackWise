import mongoose from "mongoose";
import dotenv from "dotenv"
import logger from "./logger.config";
dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.DB_URL!);
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Error while connecting database", error);
    process.exit(1);
  }
}

export default connectDB
