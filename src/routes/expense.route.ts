import { Router } from "express";
import {
  createExpense,
  dailyExpenseSummary,
  deleteExpense,
  getExpenses,
  getSingleExpense,
  monthlyExpenseSummary,
  updateExpense,
} from "../controllers/expense.controller";
import app from "../app";
import { protect } from "../middlewares/auth.middleware";

const expenseRouter = Router();
expenseRouter.use(protect); // Apply authentication middleware to all routes in this router

expenseRouter.route("/").post(createExpense).get(getExpenses);

expenseRouter.get("/summary", monthlyExpenseSummary);
expenseRouter.get("/daily-summary", dailyExpenseSummary);

expenseRouter
  .route("/:expenseId")
  .get(getSingleExpense)
  .patch(updateExpense)
  .delete(deleteExpense);

export default expenseRouter;
