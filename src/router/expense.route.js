const { Router } = require("express");
const {
  monthlySummary,
  getSingleExpense,
  updateExpense,
  deleteExpense,
  getAllExpenses,
  yearlySummary,
} = require("../controllers/expense.controller");
const { protect } = require("../controllers/auth.controller");

const router = Router();

router.route("/").get(protect, getAllExpenses);

router.route("/month-summary/:year/:month").get(protect, monthlySummary);

router.route("/year-summary/:year").get(protect, yearlySummary);

router
  .route("/:expenseId")
  .get(protect, getSingleExpense)
  .patch(protect, updateExpense)
  .delete(protect, deleteExpense);

module.exports = router;
