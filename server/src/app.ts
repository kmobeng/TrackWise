import express, { Application, Request, Response } from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";
import authRouter from "./routes/auth.route";
import httpLogger from "./config/httpLogger.config";
import { apiLimiter } from "./middlewares/limiter.middleware";
import expenseRouter from "./routes/expense.route";
import categoryRouter from "./routes/category.route";
import budgetRouter from "./routes/budget.route";
import passport from "passport";
import "./config/passport.config";
import userRouter from "./routes/user.routes";

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

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "API is running" });
});

app.use(passport.initialize());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/expenses", expenseRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/budget", budgetRouter);
app.use("/api/v1/users", userRouter);

app.use(errorHandler);
export default app;
