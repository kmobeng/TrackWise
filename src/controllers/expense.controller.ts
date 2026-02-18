const logger = require("../config/logger.config");
const {
  createExpenseService,
  getExpenseForACategoryService,
  getSingleExpenseService,
  updateExpenseService,
  deleteExpenseService,
  summaryService,
  monthlySummaryService,
  getAllExpensesService,
  yearlySummaryService,
} = require("../services/expense.service");

exports.createExpense = async (req, res, next) => {
  try {
    const { desc, amount, createdAt } = req.body;
    const { categoryId } = req.params;
    const userId = req.user._id;

    logger.info("Creating new expense", {
      desc,
      amount,
      createdAt,
      categoryId,
      userId,
    });

    const expense = await createExpenseService(
      desc,
      amount,
      createdAt,
      categoryId,
      userId
    );

    logger.info("Expense created successfully", {
      expenseId: expense._id,
      categoryId,
      userId,
    });

    res.status(201).json({
      status: "success",
      data: expense,
    });
  } catch (error) {
    logger.error("Error creating expense", {
      error: error.message,
      stack: error.stack,
      category: req.params.categoryId,
      user: req.user._id,
      body: req.body,
    });
    next(error);
  }
};

exports.getAllExpenses = async (req, res, next) => {
  try {
    logger.info("Fetching expenses", { userId: req.user._id });
    const expenses = await getAllExpensesService(req.user._id, req.query);
    logger.info("Expenses fetched successfully", {
      count: expenses.length,
      userId: req.user._id,
    });
    res
      .status(200)
      .json({ status: "success", result: expenses.length, data: { expenses } });
  } catch (error) {
    logger.error("Error fetching all expense", {
      error: error.message,
      stack: error.stack,
      user: req.user._id,
    });
    next(error);
  }
};

exports.getExpenseForACategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const userId = req.user._id;
    logger.info("Fetching all expenses", {
      categoryId,
      userId,
    });

    const expenses = await getExpenseForACategoryService(
      categoryId,
      userId,
      req.query
    );

    logger.info("Expenses fetched successfully", {
      count: expenses.length,
      userId,
      categoryId,
    });
    res.status(200).json({
      status: "success",
      length: expenses.length,
      data: { expenses },
    });
  } catch (error) {
    logger.error("Error fetching expenses", {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
      categoryId: req.params?.categoryId,
    });
    next(error);
  }
};

exports.getSingleExpense = async (req, res, next) => {
  try {
    const { expenseId, categoryId } = req.params;
    userId = req.user._id;

    logger.info("Fetching single expense", {
      expenseId,
      userId,
      categoryId,
    });

    const expense = await getSingleExpenseService(
      categoryId,
      expenseId,
      userId
    );

    logger.info("Single expense fetched successfully", {
      expenseId,
      userId,
      categoryId,
    });

    res.status(200).json({
      status: "success",
      data: expense,
    });
  } catch (error) {
    logger.error("Error fetching single expense", {
      error: error.message,
      stack: error.stack,
      expenseId: req.params.expenseId,
      categoryId: req.params.categoryId,
      userId: req.user._id,
    });
    next(error);
  }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const { categoryId, expenseId } = req.params;
    const { desc, amount } = req.body;
    const userId = req.user._id;

    logger.info("Updating expense", {
      expenseId,
      categoryId,
      updates: { desc, amount },
      userId,
    });

    const expense = await updateExpenseService(
      expenseId,
      categoryId,
      userId,
      desc,
      amount
    );

    logger.info("Expense updated successfully", {
      expenseId,
      categoryId,
      userId,
    });

    res.status(200).json({
      status: "success",
      data: expense,
    });
  } catch (error) {
    logger.error("Error updating expense", {
      error: error.message,
      stack: error.stack,
      expenseId: req.params.id,
      categoryId: req.params.id,
      userId: req.user._id,
      body: req.body,
    });
    next(error);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const { expenseId, categoryId } = req.params;
    const userId = req.user._id;
    logger.info("Deleting expense", {
      expenseId,
      categoryId,
      userId,
    });

    await deleteExpenseService(expenseId, categoryId, userId);

    logger.info("Expense deleted successfully", {
      expenseId,
      categoryId,
      userId,
    });

    res.status(200).json({
      status: "success",
    });
  } catch (error) {
    logger.error("Error deleting expense", {
      error: error.message,
      stack: error.stack,
      expenseId: req.params.id,
      categoryId: req.params.id,
      userId: req.user._id,
    });
    next(error);
  }
};

exports.monthlySummary = async (req, res, next) => {
  try {
    const { year, month } = req.params;

    logger.info("Fetching monthly summary", {
      year,
      month,
      userId: req.user.id,
    });

    const result = await monthlySummaryService(year, month, req.user._id);

    if (result.length === 0) {
      return res.status(404).json({ message: "No results found!" });
    }

    logger.info("Monthly summary fetched successfully", {
      year,
      month,
      userId: req.user.id,
    });

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    logger.error("Error fetching monthly summary", {
      error: error.message,
      stack: error.stack,
      year: req.params.year,
      month: req.params.month,
      userId: req.user?.id,
    });
    next(error);
  }
};

exports.yearlySummary = async (req, res, next) => {
  try {
    const { year } = req.params;

    logger.info("Fetching yearly summary", {
      year,
      userId: req.user.id,
    });

    const result = await yearlySummaryService(year, req.user._id);

    logger.info("Yeatly summary fetched successfully", {
      year,
      userId: req.user.id,
    });

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    logger.error("Error fetching yearly summary", {
      error: error.message,
      stack: error.stack,
      year: req.params.year,
      userId: req.user?.id,
    });
    next(error);
  }
};
