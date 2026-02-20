import Category from "../model/category.model"
import createError from "../utils/expense.util";

export const createCategoryService = async (name:string, user:string) => {
  try {
    const category = await Category.create({ name, user });
    if (!category) {
      throw createError(400, "Unable to create category");
    }
    return category;
  } catch (error) {
    throw error;
  }
};

exports.getAllCategoriesService = async (id, queryString) => {
  try {
    const features = new APIFeatures(Category.find({ user: id }), queryString)
      .filter()
      .sort()
      .paginate();
    const categories = await features.query;
    if (!categories) {
      throw createError(400, "Error while fetching categories");
    }
    return categories;
  } catch (error) {
    throw error;
  }
};

exports.getSingleCategoryService = async (id, userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, "Invlaid ID");
    }
    const category = await Category.findOne({ _id: id, user: userId });
    return category;
  } catch (error) {
    throw error;
  }
};

exports.updateCategoryService = async (id, userId, name) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, "Invalid ID");
    }
    const updatedCategory = await Category.findOneAndUpdate(
      { _id: id, user: userId },
      { name: name },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      const categoryExists = await Category.findById(id);

      if (!categoryExists) {
        throw createError(404, "Category not found");
      } else {
        throw createError(
          403,
          "You are not authorized to update this category"
        );
      }
    }
    return updatedCategory;
  } catch (error) {
    throw error;
  }
};

exports.deleteCategoryService = async (id, userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, "Invalid ID");
    }
    const category = await Category.findOneAndDelete({ _id: id, user: userId });
    if (!category) {
      const categoryExists = await Category.findById(id);

      if (!categoryExists) {
        throw createError(404, "Category not found");
      } else {
        throw createError(
          403,
          "You are not authorized to update this category"
        );
      }
    }
    return category;
  } catch (error) {
    throw error;
  }
};
