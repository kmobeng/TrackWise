import { Router } from "express";
import {
  isEmailVerified,
  requirePasswordChanged,
  protect,
} from "../middlewares/auth.middleware";
import {
  deleteBudget,
  deleteCategoryBudget,
  getBudget,
  setBudget,
  setCategoryBudget,
} from "../controllers/budget.controller";

const budgetRouter = Router();

budgetRouter.use(protect);
budgetRouter.use(isEmailVerified);
budgetRouter.use(requirePasswordChanged);

budgetRouter.route("/").post(setBudget).get(getBudget).delete(deleteBudget);

budgetRouter.route("/category").post(setCategoryBudget);
budgetRouter.route("/category/:categoryId").delete(deleteCategoryBudget);

export default budgetRouter;
