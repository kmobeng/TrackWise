import { th } from "zod/locales";
import { prisma } from "../lib/prisma";
import { createError } from "../utils/error.util";

export const createExpenseService = async (
  amount: number,
  description: string | undefined,
  date: Date,
  categoryId: string,
  userId: string,
) => {
  try {
    const expense = await prisma.expense.create({
      data: {
        amount,
        description: description || null,
        date,
        categoryId,
        userId,
      },
    });
    return expense;
  } catch (error) {
    throw error;
  }
};

export const getExpensesService = async (userId: string) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });

    if (expenses.length == 0) {
      throw createError("No expenses found", 404);
    }
    return expenses;
  } catch (error) {
    throw error;
  }
};

export const getSingleExpenseService = async (
  expenseId: string,
  userId: string,
) => {
  try {
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!expense) {
      throw createError("Expense not found", 404);
    }
    return expense;
  } catch (error) {
    throw error;
  }
};

export const updateExpenseService = async (
  expenseId: string,
  userId: string,
  amount?: number,
  description?: string,
  date?: Date,
  categoryId?: string,
) => {
  try {
    const expense = await prisma.expense.update({
      where: { id: expenseId, userId },
      data: {
        ...(amount !== undefined && { amount }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date }),
        ...(categoryId !== undefined && { categoryId }),
      },
    });

    if (!expense) {
      throw createError("Expense not found", 404);
    }
    return expense;
  } catch (error) {
    throw error;
  }
};

export const deleteExpenseService = async (
  expenseId: string,
  userId: string,
) => {
  try {
    const expense = await prisma.expense.delete({
      where: { id: expenseId, userId },
    });

    if (!expense) {
      throw createError("Expense not found", 404);
    }
    return expense;
  } catch (error) {
    throw error;
  }
};
