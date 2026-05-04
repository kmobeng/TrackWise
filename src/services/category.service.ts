import { create } from "ts-node";
import { prisma } from "../lib/prisma";
import { createError } from "../utils/error.util";

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
    throw createError("Unauthorized to update this category", 403);

  return await prisma.category.delete({
    where: { id: categoryId },
  });
};
