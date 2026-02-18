const app = require("./app");
const dotenv = require("dotenv");
const { connectDB } = require("./config/db.config");
const logger = require("./config/logger.config");

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
