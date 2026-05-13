import { Router } from "express";
import {
  getMe,
  updateMe,
  deleteMe,
  setPassword,
  changePassword,
  verifyEmailUpdate,
} from "../controllers/user.controller";
import {
  isEmailVerified,
  requirePasswordChanged,
  protect,
} from "../middlewares/auth.middleware";

const userRouter = Router();
userRouter.use(protect);

userRouter.post("/set-password", setPassword);

userRouter.use(isEmailVerified);
userRouter.use(requirePasswordChanged);

userRouter.get("/me", getMe);
userRouter.patch("/me", updateMe);
userRouter.delete("/me", deleteMe);
userRouter.post("/verify-email-update", verifyEmailUpdate);
userRouter.post("/change-password", changePassword);

export default userRouter;
