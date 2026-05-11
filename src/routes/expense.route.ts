import { Router } from "express";
import {
  aiMonthlySummary,
  autoCategorizeExpense,
  categoryMonthlySummary,
  createExpense,
  dailyExpenseSummary,
  deleteExpense,
  getExpenses,
  getSingleExpense,
  monthlyExpenseSummary,
  updateExpense,
} from "../controllers/expense.controller";
import { isEmailVerified, isPasswordChangeRequired, protect } from "../middlewares/auth.middleware";

const expenseRouter = Router();
expenseRouter.use(protect); // Apply authentication middleware to all routes in this router
expenseRouter.use(isEmailVerified)
expenseRouter.use(isPasswordChangeRequired)

expenseRouter.route("/").post(createExpense).get(getExpenses);

expenseRouter.post("/auto-categorize", autoCategorizeExpense);
expenseRouter.get("/summary", monthlyExpenseSummary);
expenseRouter.get("/daily-summary", dailyExpenseSummary);
expenseRouter.get("/category-summary", categoryMonthlySummary);
expenseRouter.get("/ai-summary", aiMonthlySummary);

expenseRouter
  .route("/:expenseId")
  .get(getSingleExpense)
  .patch(updateExpense)
  .delete(deleteExpense);

export default expenseRouter;
