import express, { Application, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";

const app: Application = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true , limit: "50kb"}));

app.get("/", (req: Request, res: Response) => {
    res.json({ message: "API is running" });
});

export default app;