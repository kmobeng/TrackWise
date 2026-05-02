import { Router } from "express";
import {
  createExpense,
  deleteExpense,
  getExpenses,
  getSingleExpense,
  updateExpense,
} from "../controllers/expense.controller";
import app from "../app";
import { protect } from "../middlewares/auth.middleware";

const expenseRouter = Router();
expenseRouter.use(protect); // Apply authentication middleware to all routes in this router

expenseRouter.route("/").post(createExpense).get(getExpenses);
expenseRouter
  .route("/:expenseId")
  .get(getSingleExpense)
  .patch(updateExpense)
  .delete(deleteExpense);

export default expenseRouter;
