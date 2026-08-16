import dotenv from "dotenv";
dotenv.config();
import app from "./app";
import logger from "./config/winston.config";
import { startEmailWorker } from "./workers/email.worker";


const port = process.env.PORT || 5000;

const startServer = () => {
    try {
        app.listen(port, () => {
            logger.info(`Server is running on http://localhost:${port}`);
            startEmailWorker();
        });
    } catch (error) {
        logger.error("Error starting server", error);
    }
}

startServer();