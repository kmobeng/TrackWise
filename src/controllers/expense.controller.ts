import { Request, Response, NextFunction } from "express";
import { createExpenseSchema } from "../validators/expense.validator";
import { createError } from "../utils/error.util";
import { prisma } from "../lib/prisma";
import {
  createExpenseService,
  getExpensesService,
  getSingleExpenseService,
} from "../services/expense.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { toCedis, toPesewas } from "../utils/convertAmount.util";

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
