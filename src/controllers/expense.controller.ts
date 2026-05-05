import { Request, Response, NextFunction } from "express";
import {
  createExpenseSchema,
  dailyExpenseSummarySchema,
  monthlyExpenseSummarySchema,
  updateExpenseSchema,
} from "../validators/expense.validator";
import { createError } from "../utils/error.util";
import { prisma } from "../lib/prisma";
import {
  createExpenseService,
  deleteExpenseService,
  dailyExpenseSummaryService,
  getExpensesService,
  getSingleExpenseService,
  monthlyExpenseSummaryService,
  updateExpenseService,
} from "../services/expense.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { toCedis, toPesewas } from "../utils/convertAmount.util";
import { ca } from "zod/locales";

export const createExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    let categoryId = parsed.data.categoryId;
    if (!categoryId) {
      const otherCategory = await prisma.category.findFirst({
        where: {
          name: "Other",
          isDefault: true,
        },
      });
      categoryId = otherCategory!.id;
    }

    const { amount, description, date } = parsed.data;

    const pesewas = toPesewas(amount);
    const dateObj = new Date(date);

    const expense = await createExpenseService(
      pesewas,
      description,
      dateObj,
      categoryId,
      req.user!.id,
    );

    expense.amount = toCedis(expense.amount);

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const expenses = await getExpensesService(userId);

    const formattedExpenses = expenses.map((expense) => ({
      ...expense,
      amount: toCedis(expense.amount),
    }));

    res.status(200).json({
      success: true,
      result: formattedExpenses.length,
      data: formattedExpenses,
    });
  } catch (error) {
    next(error);
  }
};

export const getSingleExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const expenseId = req.params.expenseId;
    if (!expenseId) {
      throw createError("Expense ID is required", 400);
    }

    const expense = await getSingleExpenseService(expenseId.toString(), userId);

    expense.amount = toCedis(expense.amount);

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.params.expenseId) {
      throw createError("Expense ID is required", 400);
    }
    const parsed = updateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const expense = await updateExpenseService(
      req.params.expenseId.toString(),
      req.user!.id,
      parsed.data.amount ? toPesewas(parsed.data.amount) : undefined,
      parsed.data.description,
      parsed.data.date ? new Date(parsed.data.date) : undefined,
      parsed.data.categoryId,
    );

    expense.amount = toCedis(expense.amount);

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.params.expenseId) {
      throw createError("Expense ID is required", 400);
    }

    const expense = await deleteExpenseService(
      req.params.expenseId.toString(),
      req.user!.id,
    );

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const monthlyExpenseSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = monthlyExpenseSummarySchema.safeParse(req.query);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { month, year } = parsed.data;

    const userId = req.user!.id;
    const summary = await monthlyExpenseSummaryService(userId, month, year);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const dailyExpenseSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = dailyExpenseSummarySchema.safeParse(req.query);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { month, year } = parsed.data;
    const userId = req.user!.id;
    const summary = await dailyExpenseSummaryService(userId, month, year);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};
