const { Router } = require("express");
const {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  getSingleCategory,
} = require("../controllers/category.controller");
const { protect } = require("../controllers/auth.controller");
const {
  createExpense,
  getExpenseForACategory,
} = require("../controllers/expense.controller");

const categoryRoutes = Router();

categoryRoutes
  .route("/")
  .post(protect, createCategory)
  .get(protect, getAllCategories);

categoryRoutes
  .route("/:categoryId")
  .get(protect, getSingleCategory)
  .patch(protect, updateCategory)
  .delete(protect, deleteCategory);

categoryRoutes
  .route("/:categoryId/expenses")
  .post(protect, createExpense)
  .get(protect, getExpenseForACategory);

module.exports = categoryRoutes;
