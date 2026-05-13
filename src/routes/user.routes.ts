import { Router } from "express";
import {
  getMe,
  updateMe,
  deleteMe,
  setPassword,
  changePassword,
  verifyEmailUpdate,
} from "../controllers/user.controller";
import { protect } from "../middlewares/auth.middleware";

const userRouter = Router();
userRouter.use(protect);

userRouter.get("/me", getMe);
userRouter.patch("/me", updateMe);
userRouter.delete("/me", deleteMe);
userRouter.post("/set-password", setPassword);
userRouter.post("/change-password", changePassword);
userRouter.post("/verify-email-update", verifyEmailUpdate);

export default userRouter;
