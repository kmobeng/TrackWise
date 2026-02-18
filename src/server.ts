import dotenv from "dotenv"
import app from "./app";
import connectDB from "./config/db.config";
import logger from "./config/logger.config";


dotenv.config();

const port = process.env.port;

async function startServer() {
  try {
    await connectDB();
    app.listen(port, () => {
      logger.info("Server is running on port 4000");
    });
  } catch (error) {
    logger.error("Unable to start server");
    process.exit(1);
  }
}

startServer();
