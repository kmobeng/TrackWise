import { Request, Response, NextFunction } from "express";
import {
  createBudgetSchema,
  deleteCategoryBudgetSchema,
  setCategoryBudgetSchema,
} from "../validators/budget.validator";
import { createError } from "../utils/error.util";
import {
  deleteBudgetService,
  deleteCategoryBudgetService,
  getBudgetService,
  setBudgetService,
  setCategoryBudgetService,
} from "../services/budget.service";

export const setBudget = async (
  req: Request,
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
  req: Request,
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

export const deleteBudget = async (
  req: Request,
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

export const setCategoryBudget = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = setCategoryBudgetSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { categoryId, amount } = parsed.data;
    const userId = req.user!.id;

    const categoryBudget = await setCategoryBudgetService(
      userId,
      categoryId,
      amount,
    );

    res.status(200).json({ success: true, data: categoryBudget });
  } catch (error) {
    next(error);
  }
};

export const deleteCategoryBudget = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = deleteCategoryBudgetSchema.safeParse(req.params);

    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { categoryId } = parsed.data;
    const userId = req.user!.id;

    const result = await deleteCategoryBudgetService(userId, categoryId);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
