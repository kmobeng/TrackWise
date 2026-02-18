const Category = require("../model/category.model");
const Expense = require("../model/expense.model");
const { createError } = require("../utils/expense.util");
const mongoose = require("mongoose");
const APIFeatures = require("../utils/ApiFeatures.utils");

exports.createExpenseService = async (
  desc,
  amount,
  createdAt,
  category,
  user
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(category)) {
      throw createError(400, "Invalid category id");
    }
    const categoryCheck = await Category.findOne({
      _id: category,
      user: user,
    });
    if (!categoryCheck) {
      throw createError(403, "You are not permitted to post to this category");
    }
    const expense = await Expense.create({
      desc,
      amount,
      createdAt,
      category,
      user,
    });
    if (!expense) {
      throw createError(400, "Unable to create an expense");
    }
    return expense;
  } catch (error) {
    throw error;
  }
};

exports.getAllExpensesService = async (userId, queryString) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw createError(400, "Invalid user Id");
    }
    const features = new APIFeatures(
      Expense.find({ user: userId }),
      queryString
    )
      .filter()
      .sort()
      .paginate();
    const expenses = await features.query.populate({
      path: "category",
      select: "-__v -createdAt -user -date",
      options: { skipPopulate: true },
    });
    return expenses;
  } catch (error) {
    throw error;
  }
};

exports.getExpenseForACategoryService = async (
  categoryId,
  userId,
  queryString
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw createError(400, "Invalid category Id");
    }
    const features = new APIFeatures(
      Expense.find({
        user: userId,
        category: categoryId,
      }),
      queryString
    )
      .filter()
      .sort()
      .paginate();
    const expenses = await features.query.populate({
      path: "category",
      select: "-__v -createdAt -user -date",
      options: { skipPopulate: true },
    });
    if (!expenses) {
      throw createError(404, "Unable to find expenses");
    }
    return expenses;
  } catch (error) {
    throw error;
  }
};

exports.getSingleExpenseService = async (categoryId, expenseId, userId) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(categoryId) ||
      !mongoose.Types.ObjectId.isValid(expenseId)
    ) {
      throw createError(400, "Invalid category Id or expense Id");
    }

    const expense = await Expense.findOne({
      _id: expenseId,
      category: categoryId,
      user: userId,
    }).populate({
      path: "category user",
      select: "-__v -createdAt -user",
      options: { skipPopulate: true },
    });
    if (!expense) {
      throw createError(404, "Unable to find expense");
    }
    return expense;
  } catch (error) {
    throw error;
  }
};

exports.updateExpenseService = async (
  expenseId,
  categoryId,
  userId,
  newdesc,
  newamount
) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(expenseId) ||
      !mongoose.Types.ObjectId.isValid(categoryId)
    ) {
      throw createError(400, "Invalid expense ID format");
    }
    const expense = await Expense.findOneAndUpdate(
      { _id: expenseId, category: categoryId, user: userId },
      { desc: newdesc, amount: newamount },
      { new: true, runValidators: true }
    ).populate({
      path: "category user",
      select: "-__v -createdAt -user",
      options: { skipPopulate: true },
    });
    if (!expense) {
      throw createError(404, "Unable to update expense");
    }
    return expense;
  } catch (error) {
    throw error;
  }
};

exports.deleteExpenseService = async (expenseId, categoryId, userId) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(expenseId) ||
      !mongoose.Types.ObjectId.isValid(categoryId)
    ) {
      throw createError(400, "Invalid expense ID format");
    }
    const expense = await Expense.findOneAndDelete({
      _id: expenseId,
      category: categoryId,
      user: userId,
    });
    if (!expense) {
      throw createError(404, "Unable to delete expense");
    }
    return expense;
  } catch (error) {
    throw error;
  }
};

exports.monthlySummaryService = async (year, month, userId) => {
  try {
    const summary = await Expense.aggregate([
      {
        $match: {
          user: userId,
          date: {
            $gte: new Date(year, month - 1, 1),
            $lte: new Date(year, month, 0, 23, 59, 59, 999),
          },
        },
      },
      {
        $group: {
          _id: null,
          expensesCount: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          leastAmount: { $min: "$amount" },
          highestAmount: { $max: "$amount" },
          averageAmount: { $avg: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          expensesCount: 1,
          totalAmount: 1,
          leastAmount: 1,
          highestAmount: 1,
          averageAmount: { $round: ["$averageAmount", 2] },
        },
      },
    ]);

    return summary;
  } catch (error) {
    throw error;
  }
};

exports.yearlySummaryService = async (year, userId) => {
  try {
    const summary = await Expense.aggregate([
      {
        $match: {
          user: userId,
          date: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 13, 0, 23, 59, 59, 999),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$date" },
          expensesCount: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          leastAmount: { $min: "$amount" },
          highestAmount: { $max: "$amount" },
          averageAmount: { $avg: "$amount" },
        },
      },
      {
        $addFields: { month: "$_id" },
      },
      {
        $project: {
          _id: 0,
          month: 1,
          expensesCount: 1,
          totalAmount: 1,
          leastAmount: 1,
          highestAmount: 1,
          averageAmount: { $round: ["$averageAmount", 2] },
        },
      },
      {
        $sort: { month: 1 },
      },
    ]);

    return summary;
  } catch (error) {
    throw error;
  }
};
