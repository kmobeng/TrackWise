import { prisma } from "../lib/prisma";
import { RedisClient } from "../config/redis.config";
import { createError } from "../utils/error.util";

const DEFAULT_CATEGORIES_CACHE_KEY = "categories:defaults";

export const getDefaultCategoriesCached = async () => {
  const cached = await RedisClient.get(DEFAULT_CATEGORIES_CACHE_KEY);
  if (cached) {
    return JSON.parse(cached) 
  }

  const categories = await prisma.category.findMany({
    where: { isDefault: true },
    select: { id: true, name: true },
  });

  await RedisClient.setex(DEFAULT_CATEGORIES_CACHE_KEY,86400, JSON.stringify(categories));
  return categories;
};

export const createCategoryService = async (name: string, userId: string) => {
  try {
    const category = await prisma.category.create({
      data: {
        name,
        userId,
      },
    });

    return category;
  } catch (error) {
    throw error;
  }
};

export const getAllCategoriesService = async (userId: string) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        userId,
      },
    });

    if (categories.length == 0) {
      throw createError("No categories found", 404);
    }
    return categories;
  } catch (error) {
    throw error;
  }
};

export const getSingleCategoryService = async (
  categoryId: string,
  userId: string,
) => {
  try {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [{ userId }, { isDefault: true }],
      },
    });

    if (!category) {
      throw createError("Category not found", 404);
    }
    return category;
  } catch (error) {
    throw error;
  }
};

export const updateCategoryService = async (
  categoryId: string,
  name: string,
  userId: string,
) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) throw createError("Category not found", 404);

    if (category.isDefault)
      throw createError("Cannot update a default category", 403);

    if (category.userId !== userId)
      throw createError("Unauthorized to update this category", 403);

    return await prisma.category.update({
      where: { id: categoryId },
      data: { name },
    });
  } catch (error) {
    throw error;
  }
};

export const deleteCategoryService = async (
  categoryId: string,
  userId: string,
) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) throw createError("Category not found", 404);

  if (category.isDefault)
    throw createError("Cannot delete a default category", 403);

  if (category.userId !== userId)
    throw createError("Unauthorized to delete this category", 403);

  return await prisma.$transaction(async (tx) => {
    const otherCategory = await tx.category.findFirst({
      where: { name: "Other", isDefault: true },
    });

    const resolvedOther =
      otherCategory ??
      (await tx.category.create({
        data: { name: "Other", isDefault: true },
      }));

    if (resolvedOther.id === categoryId) {
      throw createError("Cannot delete the Other category", 403);
    }

    await tx.expense.updateMany({
      where: { categoryId, userId },
      data: { categoryId: resolvedOther.id },
    });

    await tx.categoryBudget.deleteMany({
      where: { categoryId },
    });

    return tx.category.delete({
      where: { id: categoryId },
    });
  });
};
