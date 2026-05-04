import { Request, Response, NextFunction } from "express";
import { createBudgetSchema } from "../validators/budget.validator";
import { createError } from "../utils/error.util";
import {
  deleteBudgetService,
  getBudgetService,
  setBudgetService,
  updateBudgetService,
} from "../services/budget.service";
import { AuthRequest } from "../middlewares/auth.middleware";

export const setBudget = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = createBudgetSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { amount } = parsed.data;

    const budget = await setBudgetService(req.user!.id, amount);

    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
};

export const getBudget = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;

    const budget = await getBudgetService(userId);

    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
};

export const updateBudget = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = createBudgetSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { amount } = parsed.data;

    const budget = await updateBudgetService(req.user!.id, amount);

    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
};

export const deleteBudget = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userid = req.user!.id;

    await deleteBudgetService(userid);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

