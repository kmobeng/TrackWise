import { Request,Response,NextFunction   } from "express";
import { IUser } from "../model/user.model";
import createError from "../utils/expense.util";
import logger from "../config/logger.config";
import { createCategoryService, deleteCategoryService, getAllCategoriesService, getSingleCategoryService, updateCategoryService } from "../services/category.service";


declare global {
  namespace Express {
    interface Request {
      user: IUser;
    }
  }
}

exports.createCategory = async (req:Request, res:Response, next:NextFunction) => {
  try {
    const { name } = req.body;
    const user = req.user._id;
    if (!name || !user) {
      throw createError(400, "Please provide name and user");
    }
    logger.info("creating category", { name, user });
    const category = await createCategoryService(name, user.toString());
    logger.info("category created", {
      id: category._id,
      name: name,
      user: category.user,
    });
    res.status(201).json({ status: "success", data: { category } });
  } catch (error:any) {
    if (error.code === 11000) {
      return next(
        createError(400, "You already have a category with this name")
      );
    }
    logger.error("Error while creating category", {
      error: error.message,
      stack: error.stack,
      categoryName: req.body.name,
    });
    next(error);
  }
};

exports.getAllCategories = async (req:Request, res:Response, next:NextFunction) => {
  try {
    logger.info("Fetching all categories", {
      user: req.user._id,
      email: req.user.email,
    });
    const categories = await getAllCategoriesService(req.user._id.toString(), req.query);
    logger.info("Categories fetched", {
      user: req.user._id,
      email: req.user.email,
    });
    res.status(200).json({
      status: "success",
      results: categories.length,
      data: { categories },
    });
  } catch (error:any) {
    logger.error("Error while fetching all categories", {
      error: error.message,
      stack: error.stack,
      email: req.user.email,
      userId: req.user._id,
    });
    next(error);
  }
};

exports.getSingleCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user._id;
    const { categoryId } = req.params;
    if (!categoryId) {
      throw createError(400, "No ID provided");
    }
    logger.info("Fetching single category", {
      category: categoryId,
      user: userId,
      email: req.user.email,
    });
    const category = await getSingleCategoryService(categoryId.toString(), userId.toString());
    logger.info("Single category fetched", {
      category: categoryId,
      user: userId,
      email: req.user.email,
    });
    res.status(200).json({ status: "success", data: { category } });
  } catch (error: any) {
    logger.error("Error while fetching category", {
      error: error.message,
      stack: error.stack,
      categoryId: req.params.categoryId,
      email: req.user.email,
      userId: req.user._id,
    });
    next(error);
  }
};

exports.updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name) {
      throw createError(400, "No name provided");
    }
    const { categoryId } = req.params;
    if (!categoryId) {
      throw createError(400, "No ID provided");
    }
    logger.info("Attempt to update the category", {
      name: name,
      email: req.user.email,
      userId: req.user._id,
      categoryId,
    });
    const category = await updateCategoryService(
      categoryId.toString(),
      req.user._id.toString(),
      name
    );
    logger.info("Category updated", {
      name: name,
      email: req.user.email,
      id: req.user._id,
      categoryId,
    });
    res.status(200).json({ status: "success", data: { category } });
  } catch (error: any) {
    logger.error("Error while updating the category", {
      error: error.message,
      stack: error.stack,
      category: req.params?.categoryId,
      email: req.user.email,
      userId: req.user._id,
    });
    next(error);
  }
};

exports.deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user._id;
    const { categoryId } = req.params;
    if (!categoryId) {
      throw createError(400, "No ID provided");
    }
    logger.info("Attempt to delete category", {
      categoryId,
      userId,
      email: req.user.email,
    });
    const category = await deleteCategoryService(categoryId.toString(), userId.toString());
    logger.info("Category deleted", {
      categoryId,
      userId,
      email: req.user._id,
    });
    res.status(200).json({ status: "success" });
  } catch (error: any) {
    logger.error("Error while deleting the category", {
      error: error.message,
      stack: error.stack,
      category: req.params?.categoryId,
      email: req.user.email,
      userId: req.user._id,
    });
    next(error);
  }
};
