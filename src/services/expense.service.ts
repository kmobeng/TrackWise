import { RedisClient } from "../config/redis.config";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { groq } from "../utils/autoCategorize.util";
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

interface GetExpensesParams {
  userId: string;
  page?: number;
  limit?: number;
  sortBy?: "date" | "amount" | "category";
  sortOrder?: "asc" | "desc";
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  desc?: string | undefined;
}

export const getExpensesService = async ({
  userId,
  page = 1,
  limit = 10,
  sortBy = "date",
  sortOrder = "desc",
  startDate,
  endDate,
  desc,
}: GetExpensesParams) => {
  // build filters
  const where: Prisma.ExpenseWhereInput = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = startDate;
    if (endDate) where.date.lte = endDate;
  }

  if (desc) {
    where.description = { contains: desc, mode: "insensitive" };
  }

  // build sorting
  let orderBy: Prisma.ExpenseOrderByWithRelationInput;

  if (sortBy === "category") {
    orderBy = { category: { name: sortOrder } };
  } else {
    orderBy = { [sortBy]: sortOrder };
  }

  // pagination
  const skip = (page - 1) * limit;

  // run queries in parallel
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  // convert amounts to cedis
  const data = expenses.map((e) => ({ ...e, amount: toCedis(e.amount) }));

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
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
  const cacheKey = `expense:monthly-summary:${userId}:${year}:${month}`;
  const cacheTtlSeconds = 86400;

    const cached = await RedisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

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

  const response = {
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

    await RedisClient.set(
      cacheKey,
      JSON.stringify(response),
      "EX",
      cacheTtlSeconds,
    );
 

  return response;
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

export const aiMonthlySummaryService = async (
  userId: string,
  month: number,
  year: number,
) => {
  const now = new Date();
  const isCurrentMonth =
    now.getUTCFullYear() === year && now.getUTCMonth() + 1 === month;

  if (isCurrentMonth) {
    throw createError("AI summary is only available for completed months", 400);
  }

  // check cache first
  const cacheKey = `ai-summary:${userId}:${year}-${month}`;
  const cached = await RedisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("default", { month: "long" });

  // fetch all data in parallel
  const [stats, categoryBreakdown, dailyTotals, budget] = await Promise.all([
    monthlyExpenseSummaryService(userId, month, year),
    categoryMonthlySummaryService(userId, month, year),
    dailyExpenseSummaryService(userId, month, year),
    prisma.budget.findUnique({
      where: { userId },
      include: {
        categoryBudgets: {
          include: { category: { select: { name: true } } },
        },
      },
    }),
  ]);

  // find highest spending day
 const highestSpendingDay = dailyTotals.dailyTotals.length > 0
  ? dailyTotals.dailyTotals.reduce((max, day) =>
      day.total > max.total ? day : max
    )
  : null;

  // category budgets
  const categoryBudgets = budget?.categoryBudgets.map((cb) => ({
    category: cb.category.name,
    budget: toCedis(cb.amount),
  })) ?? [];

  // percentage change from previous month
  const percentageChange =
    stats.previousMonthTotal === 0
      ? null
      : (((stats.totalSpent - stats.previousMonthTotal) / stats.previousMonthTotal) * 100).toFixed(1);

  const prompt = `
You are a personal finance assistant writing a monthly expense summary report.

Data for ${monthName} ${year}:
- Total spent: GHS ${stats.totalSpent}
- Previous month total: GHS ${stats.previousMonthTotal}
- Percentage change from last month: ${percentageChange !== null ? `${percentageChange}%` : "No previous month data"}
- Expenses logged this month: ${stats.expenseCount.currentMonth}
- Highest spending category: ${stats.mostSpentCategory.name} (GHS ${stats.mostSpentCategory.total})
- Highest spending day: ${highestSpendingDay?.date} (GHS ${highestSpendingDay?.total})
- Category breakdown: ${JSON.stringify(categoryBreakdown.categories, null, 2)}
- Category budgets: ${JSON.stringify(categoryBudgets, null, 2)}

Guidelines:
- Write exactly 4 paragraphs in prose, no bullet points
- Paragraph 1: overall spending summary, compare to last month with the exact percentage change
- Paragraph 2: break down the top 2-3 categories with specific numbers, mention if any exceeded or came close to their budget
- Paragraph 3: mention the highest spending day and any spending patterns you notice from the data
- Paragraph 4: give 2-3 specific and actionable suggestions for next month based on the data
- Use "GHS" for all amounts
- Be specific with numbers, never be vague
- Tone: friendly financial advisor
- Do NOT suggest the user reach out for help or contact anyone
- Do NOT end with offers of assistance or support
- End with an encouraging but self-contained closing statement
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const result = {
    month,
    year,
    summary: response.choices[0]?.message.content?.trim(),
  };

  // no expiry — past month data never changes
  await RedisClient.set(cacheKey, JSON.stringify(result));

  return result;
};