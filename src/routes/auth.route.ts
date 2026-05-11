import { Router } from "express";
import {
  forgotPasswoerd,
  googleRedirect,
  login,
  logout,
  refreshToken,
  requestEmailVerification,
  resetPassword,
  signUp,
  verifyEmail,
} from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";
import {
  loginLimiter,
  resetPasswordLimiter,
} from "../middlewares/limiter.middleware";
import passport from "passport";

const authRouter = Router();

authRouter.post("/signup", loginLimiter, signUp);
authRouter.post("/login", loginLimiter, login);
authRouter.post("/refresh", refreshToken);
authRouter.post("/forgot-password", resetPasswordLimiter, forgotPasswoerd);
authRouter.post("/reset-password/:token", resetPasswordLimiter, resetPassword);

authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
authRouter.get(
  "/google/redirect",
  passport.authenticate("google", {
    failureRedirect: "/api/auth/login",
    session: false,
  }),
  googleRedirect,
);

authRouter.use(protect);

authRouter.post("/logout", logout);
authRouter.post("/request-email-verification", requestEmailVerification);
authRouter.post("/verify-email", verifyEmail);

export default authRouter;
