import { prisma } from "../lib/prisma";
import { toCedis } from "../utils/convertAmount.util";
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
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw createError("Expense not found", 404);
    }

    if (expense.userId !== userId) {
      throw createError("Unauthorized", 403);
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId, userId },
      data: {
        amount: amount !== undefined ? amount : expense.amount,
        description:
          description !== undefined ? description : expense.description,
        date: date !== undefined ? date : expense.date,
        categoryId: categoryId !== undefined ? categoryId : expense.categoryId,
      },
    });

    return updatedExpense;
  } catch (error) {
    throw error;
  }
};

export const deleteExpenseService = async (
  expenseId: string,
  userId: string,
) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw createError("Expense not found", 404);
    }

    if (expense.userId !== userId) {
      throw createError("Unauthorized", 403);
    }

    await prisma.expense.delete({
      where: { id: expenseId, userId },
    });

    return expense;
  } catch (error) {
    throw error;
  }
};

export const monthlyExpenseSummaryService = async (
  userId: string,
  month: number,
  year: number,
) => {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const startOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth - 1, 1));
  const endOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 0, 23, 59, 59));

  const [summary, prevMonthExpenses] = await Promise.all([
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.expense.aggregate({
      where: { userId, date: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
      _sum: { amount: true },
    }),
  ]);

  const totalSpent = toCedis(
    summary.reduce((acc, s) => acc + (s._sum.amount ?? 0), 0),
  );
  const previousMonthTotal = toCedis(prevMonthExpenses._sum.amount ?? 0);

  const mostSpentCategory = summary[0]
    ? await prisma.category.findUnique({
        where: { id: summary[0].categoryId },
        select: { name: true },
      })
    : null;

  const mostSpentAmount = summary[0] ? toCedis(summary[0]._sum.amount ?? 0) : 0;

  return {
    month,
    year,
    totalSpent,
    previousMonthTotal,
    mostSpentCategory: {
      name: mostSpentCategory?.name ?? "N/A",
      total: mostSpentAmount,
    },
  };
};
