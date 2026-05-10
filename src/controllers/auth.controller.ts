import { Request, Response, NextFunction } from "express";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  resetTokenSchema,
  signUpSchema,
} from "../validators/auth.validator";
import { createError } from "../utils/error.util";
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import {
  loginService,
  logoutService,
  refreshTokenService,
  signUpService,
} from "../services/auth.service";
import {
  generateRefreshToken,
  generateToken,
  sendToken,
} from "../utils/auth.util";
import crypto from "crypto";
import sendEmail from "../utils/email.util";
import logger from "../config/winston.config";
import { User } from "../generated/prisma/client";

const expiresAt = new Date(
  Date.now() +
    Number(process.env.REFRESH_JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000,
);

export const signUp = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = signUpSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { name, email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw createError("User already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await signUpService(name, email, hashedPassword);

    generateToken(newUser.id, req, res);

    const { refreshToken, hashedRefreshToken } = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: newUser.id,
        expiresAt,
      },
    });

    sendToken(req, res, refreshToken);

    const { password: _, ...user } = newUser;
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { email, password } = parsed.data;

    const user = await loginService(email, password);

    generateToken(user.id, req, res);

    const { refreshToken, hashedRefreshToken } = generateRefreshToken();
    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    sendToken(req, res, refreshToken);

    const { password: _, ...userData } = user;
    res.status(200).json({ success: true, data: userData });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      throw createError("No refresh token provided", 401);
    }
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await refreshTokenService(hashedRefreshToken, req, res, expiresAt);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      throw createError("No refresh token provided", 401);
    }
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await logoutService(hashedRefreshToken);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const forgotPasswoerd = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw createError("User with this email does not exist", 404);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: { token: hashedResetToken, expiresAt: resetTokenExpires },
      create: {
        token: hashedResetToken,
        userId: user.id,
        expiresAt: resetTokenExpires,
      },
    });

    try {
      const resetURL = `${req.protocol}://${req.get(
        "host",
      )}/api/v1/auth/reset-password/${resetToken}`;

      const message = `You requested a password reset. Please click on the following link to reset your password: ${resetURL}
       This link is valid for 10 minutes. If you did not request this, please ignore this email.`;
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request",
        message,
      });
    } catch (error) {
      logger.error("Error sending email:", error);
      await prisma.passwordResetToken.delete({ where: { userId: user.id } });
      throw createError(
        "There was an error sending the email. Please try again later.",
        500,
      );
    }

    res.status(200).json({
      success: true,
      message: "Password reset link sent to email",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsedToken = resetTokenSchema.safeParse({ token: req.params.token });
    if (!parsedToken.success) {
      const errorMessages = parsedToken.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { token } = parsedToken.data;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!passwordResetToken || passwordResetToken.expiresAt < new Date()) {
      throw createError("Invalid or expired reset token", 400);
    }

    const { password } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: passwordResetToken.userId },
        data: { password: hashedPassword, passwordChangedAt: new Date() },
      }),
      prisma.passwordResetToken.delete({
        where: { id: passwordResetToken.id },
      }),
    ]);

    res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
};

export const googleRedirect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user as User;
    const authAction =
      (req.authInfo as { authAction?: "signup" | "login" } | undefined)
        ?.authAction ?? "login";

    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: refreshToken.hashedRefreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    generateToken(user.id, req, res);

    sendToken(req, res, refreshToken.refreshToken);

    const { password: _, ...userResponse } = user;

    res.status(200).json({
      status: "success",
      message:
        authAction === "signup"
          ? "Account created with Google. Please set password to continue."
          : "Logged in with Google successfully.",
      data: { user: userResponse },
    });
  } catch (error) {
    next(error);
  }
};
