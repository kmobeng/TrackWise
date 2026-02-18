import express from "express"
import morgan from "morgan";



const app = express();

app.set("query parser", "extended");
app.use(morgan("dev"));
app.use(express.json());
app.use("/api/expense", expenseRoutes);
app.use("/api/users", userRoute);
app.use("/api/category", categoryRoutes);
app.use(errorHandler);

export default app
