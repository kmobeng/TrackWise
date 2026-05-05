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

  const [summary, currentMonthStats, prevMonthStats] = await Promise.all([
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.expense.aggregate({
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      _count: { _all: true },
    }),
    prisma.expense.aggregate({
      where: { userId, date: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const totalSpent = toCedis(
    summary.reduce((acc, s) => acc + (s._sum.amount ?? 0), 0),
  );
  const previousMonthTotal = toCedis(prevMonthStats._sum.amount ?? 0);
  const currentMonthCount = currentMonthStats._count._all ?? 0;
  const previousMonthCount = prevMonthStats._count._all ?? 0;

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
    expenseCount: {
      currentMonth: currentMonthCount,
      previousMonth: previousMonthCount,
    },
  };
};

export const dailyExpenseSummaryService = async (
  userId: string,
  month: number,
  year: number,
) => {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const now = new Date();
  const isCurrentMonth =
    now.getUTCFullYear() === year && now.getUTCMonth() + 1 === month;
  const endOfRange = isCurrentMonth
    ? new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      )
    : endOfMonth;

  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: startOfMonth, lte: endOfRange } },
    select: { date: true, amount: true },
    orderBy: { date: "asc" },
  });

  const totalsByDay = new Map<string, number>();
  for (const expense of expenses) {
    const dayKey = expense.date.toISOString().slice(0, 10);
    totalsByDay.set(dayKey, (totalsByDay.get(dayKey) ?? 0) + expense.amount);
  }

  const dailyTotals = [] as { date: string; total: number }[];
  for (
    let d = new Date(startOfMonth);
    d <= endOfRange;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const key = d.toISOString().slice(0, 10);
    const total = totalsByDay.get(key) ?? 0;
    dailyTotals.push({ date: key, total: toCedis(total) });
  }

  return {
    month,
    year,
    dailyTotals,
  };
};

export const categoryMonthlySummaryService = async (
  userId: string,
  month: number,
  year: number,
) => {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const summary = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  const categoryIds = summary.map((item) => item.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });

  const categoryNameById = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  const results = summary.map((item) => ({
    categoryId: item.categoryId,
    categoryName: categoryNameById.get(item.categoryId) ?? "Unknown",
    total: toCedis(item._sum.amount ?? 0),
  }));

  return {
    month,
    year,
    categories: results,
  };
};
