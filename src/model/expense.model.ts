const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema({
  amount: { type: Number, required: [true, "Amount is required"] },
  desc: { type: String, required: [true, "Description is required"] },
  date: { type: Date, default: Date.now },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
    required: [true, "category is required"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "User is required"],
  },
});

const Expense = mongoose.model("Expense", ExpenseSchema);

module.exports = Expense;
