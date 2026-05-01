import { Router } from "express";
import { forgotPasswoerd, login, logout, refreshToken, resetPassword, signUp } from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";

const authRouter = Router();

authRouter.post("/signup", signUp);
authRouter.post("/login", login);
authRouter.post("/refresh", refreshToken);
authRouter.post("/forgot-password", forgotPasswoerd);
authRouter.post("/reset-password/:token", resetPassword);

authRouter.use(protect); // protect all routes below this middleware
authRouter.post("/logout", logout);

export default authRouter;
