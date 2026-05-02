import express, { Application, Request, Response } from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";
import authRouter from "./routes/auth.route";
import httpLogger from "./config/httpLogger.config";
import { protect } from "./middlewares/auth.middleware";
import { apiLimiter } from "./middlewares/limiter.middleware";
import expenseRouter from "./routes/expense.route";

const app: Application = express();

app.use(cors());
app.use(httpLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(cookieParser());

app.use(
  cookieSession({
    maxAge: 60 * 60 * 1000,
    keys: [process.env.COOKIE_KEY!],
  }),
);

app.use(apiLimiter); // apply rate limiter to all requests

app.get("/", protect, (req: Request, res: Response) => {
  res.json({ message: "API is running" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/expenses", expenseRouter);

app.use(errorHandler);
export default app;
