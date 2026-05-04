import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
} from "../controllers/category.controller";
import { protect } from "../middlewares/auth.middleware";

const categoryRouter = Router();
categoryRouter.use(protect); // protect all routes

categoryRouter.route("/").post(createCategory).get(getAllCategories);
categoryRouter
  .route("/:id")
  .get(getSingleCategory)
  .patch(updateCategory)
  .delete(deleteCategory);

export default categoryRouter;
