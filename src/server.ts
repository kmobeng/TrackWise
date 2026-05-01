import app from "./app";
import dotenv from "dotenv";
dotenv.config();

const port = process.env.PORT || 3000;

const startServer = () => {
    try {
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (error) {
        console.log("Error starting server", error);
    }
}

startServer();