import { Router } from "express";
import { login, refreshToken, signUp } from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/signup", signUp);
authRouter.post("/login", login);
authRouter.post("/refresh", refreshToken);

export default authRouter;
