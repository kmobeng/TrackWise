const express = require("express");
const morgan = require("morgan");
const expenseRoutes = require("./router/expense.route");
const { errorHandler } = require("./middleware/expense.middleware");
const userRoute = require("./router/user.route");
const categoryRoutes = require("./router/category.route");
const qs = require("qs");

const app = express();

app.set("query parser", "extended");
app.use(morgan("dev"));
app.use(express.json());
app.use("/api/expense", expenseRoutes);
app.use("/api/users", userRoute);
app.use("/api/category", categoryRoutes);
app.use(errorHandler);

module.exports = app;
