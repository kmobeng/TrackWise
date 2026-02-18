const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "A category must have a name"],
    trim: true,
  },
  date: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
});

categorySchema.index({ user: 1, name: 1 }, { unique: true });

categorySchema.pre(/^find/, function (next) {
  if (!this.getOptions().skipPopulate) {
    this.populate({ path: "user", select: "name email" });
  }
  next();
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
