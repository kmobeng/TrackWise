import { Router } from "express";
import { login, logout, refreshToken, signUp } from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";

const authRouter = Router();

authRouter.post("/signup", signUp);
authRouter.post("/login", login);
authRouter.post("/refresh", refreshToken);

authRouter.use(protect); // protect all routes below this middleware
authRouter.post("/logout", logout);

export default authRouter;
