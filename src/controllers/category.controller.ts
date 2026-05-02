import { Request, Response, NextFunction } from "express";
import { createCategorySchema } from "../validators/category.validator";
import { createError } from "../utils/error.util";
import {
  createCategoryService,
  deleteCategoryService,
  getAllCategoriesService,
  getSingleCategoryService,
  updateCategoryService,
} from "../services/category.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { ca } from "zod/locales";

export const createCategory = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { name } = parsed.data;

    const category = createCategoryService(name, req.user!.id);

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCategories = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const categories = getAllCategoriesService(userId);

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const getSingleCategory = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const categoryId = req.params.id;
    if (!categoryId) {
      throw createError("Category ID is required", 400);
    }

    const category = getSingleCategoryService(
      categoryId.toString(),
      req.user!.id,
    );

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const categoryId = req.params.id;
    if (!categoryId) {
      throw createError("Category ID is required", 400);
    }
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { name } = parsed.data;

    const category = updateCategoryService(
      categoryId.toString(),
      name,
      req.user!.id,
    );

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const categoryId = req.params.id;
    if (!categoryId) {
      throw createError("Category ID is required", 400);
    }

    const category = deleteCategoryService(
      categoryId.toString(),
      req.user!.id,
    );
  } catch (error) {
    next(error);
  }
};
