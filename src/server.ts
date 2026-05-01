import app from "./app";
import dotenv from "dotenv";
import logger from "./config/winston.config";
dotenv.config();

const port = process.env.PORT || 3000;

const startServer = () => {
    try {
        app.listen(port, () => {
            logger.info(`Server is running on http://localhost:${port}`);
        });
    } catch (error) {
        logger.error("Error starting server", error);
    }
}

startServer();