import { prisma } from "../lib/prisma";
import { toCedis } from "../utils/convertAmount.util";
import { createError } from "../utils/error.util";

export const setBudgetService = async (userId: string, amount: number) => {
  return await prisma.budget.upsert({
    where: { userId },
    update: { amount },
    create: { userId, amount },
  });
};

export const getBudgetService = async (userId: string) => {
  try {
    const budget = await prisma.budget.findUnique({
      where: { userId },
      include: {
        categoryBudgets: {
          include: {
            category: true,
          },
        },
      },
    });
    return budget;
  } catch (error) {
    throw error;
  }
};

export const deleteBudgetService = async (userId: string) => {
  try {
    await prisma.$transaction(async (tx) => {
      const budget = await tx.budget.findUnique({
        where: { userId },
      });

      if (!budget) {
        throw createError("Budget not found", 404);
      }

      await tx.categoryBudget.deleteMany({
        where: { budgetId: budget.id },
      });

      await tx.budget.delete({
        where: { id: budget.id },
      });
    });
  } catch (error) {
    throw error;
  }
};

export const setCategoryBudgetService = async (
  userId: string,
  categoryId: string,
  amount: number,
) => {
  const budget = await prisma.budget.findUnique({
    where: { userId },
    include: { categoryBudgets: true },
  });

  if (!budget) throw createError("Please set an overall budget first", 400);

  const totalAllocated = budget.categoryBudgets
    .filter((cb) => cb.categoryId !== categoryId) // exclude current if updating
    .reduce((acc, cb) => acc + cb.amount, 0);

  if (totalAllocated + amount > budget.amount) {
    throw createError(
      `Amount exceeds budget. You have GHS ${toCedis(budget.amount - totalAllocated)} remaining to allocate`,
      400,
    );
  }

  return await prisma.categoryBudget.upsert({
    where: { budgetId_categoryId: { budgetId: budget.id, categoryId } },
    update: { amount },
    create: { budgetId: budget.id, categoryId, amount },
  });
};

export const deleteCategoryBudgetService = async (
  userId: string,
  categoryId: string,
) => {
  const budget = await prisma.budget.findUnique({
    where: { userId },
  });

  if (!budget) throw createError("Budget not found", 404);

  return await prisma.categoryBudget.delete({
    where: { budgetId_categoryId: { budgetId: budget.id, categoryId } },
  });
};
