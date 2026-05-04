import { prisma } from "../lib/prisma";

export const setBudgetService = async (userId: string, amount: number) => {
  try {
    const existingBudget = await prisma.budget.findUnique({
      where: { userId },
    });
    if (existingBudget) {
      const updatedBudget = await prisma.budget.update({
        where: { userId },
        data: { amount },
      });
      return updatedBudget;
    } else {
      const newBudget = await prisma.budget.create({
        data: {
          userId,
          amount,
        },
      });
      return newBudget;
    }
  } catch (error) {
    throw error;
  }
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

export const updateBudgetService = async (userId: string, amount: number) => {
  try {
    const updatedBudget = await prisma.budget.update({
      where: { userId },
      data: { amount },
    });
    return updatedBudget;
  } catch (error) {
    throw error;
  }
};

export const deleteBudgetService = async (userId: string) => {
  try {
    await prisma.budget.delete({
      where: { userId },
    });
  } catch (error) {
    throw error;
  }
};
