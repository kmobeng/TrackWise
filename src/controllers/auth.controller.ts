import { Request, Response, NextFunction } from "express";
import {
  emailVerificationTokenSchema,
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
  requestEmailVerificationService,
  signUpService,
} from "../services/auth.service";
import {
  generateRefreshToken,
  generateAccessToken,
  sendRefreshToken,
  refreshTokenExpiry,
} from "../utils/auth.util";
import crypto from "crypto";
import { maskEmail } from "../utils/email.util";
import { sendEmailToQueue } from "../queues/email.queue";
import { User } from "../generated/prisma/client";
import { JWTPayload } from "../middlewares/auth.middleware";
import { RedisClient } from "../config/redis.config";

export const signUp = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = signUpSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message as string;
      throw createError(errorMessage, 400);
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

    const payload: JWTPayload = {
      id: newUser.id,
      isEmailVerified: newUser.isEmailVerified,
      needToChangePassword: newUser.needToChangePassword,
      role: newUser.role!,
      provider: newUser.provider!,
      email: newUser.email,
    };

    generateAccessToken(payload, req, res);

    const { refreshToken, hashedRefreshToken } = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: newUser.id,
        expiresAt: refreshTokenExpiry(),
      },
    });

    sendRefreshToken(req, res, refreshToken);

    const { password: _, ...user } = newUser;

    await requestEmailVerificationService(newUser.id, email);

    res.status(201).json({
      success: true,
      message:
        "Account created successfully. Email verification token has been sent to your email",
      data: user,
    });
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
      const errorMessage = parsed.error.issues[0]?.message as string;
      throw createError(errorMessage, 400);
    }

    const { email, password } = parsed.data;

    const user = await loginService(email, password);

    const payload: JWTPayload = {
      id: user.id,
      isEmailVerified: user.isEmailVerified,
      needToChangePassword: user.needToChangePassword,
      role: user.role!,
      provider: user.provider!,
      email: user.email,
    };

    generateAccessToken(payload, req, res);

    const { refreshToken, hashedRefreshToken } = generateRefreshToken();
    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiry(),
      },
    });

    sendRefreshToken(req, res, refreshToken);

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

    await refreshTokenService(hashedRefreshToken, req, res, refreshTokenExpiry());

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
      sameSite: "none",
    });

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    const remainingTtl = req.user?.exp! - Math.floor(Date.now() / 1000);

    if (remainingTtl > 0) {
      RedisClient.setex(`blacklist:${req.user?.jti}`, remainingTtl, "true");
    }

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message as string;
      throw createError(errorMessage, 400);
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(200).json({ success: true });
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

    const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const message = `You requested a password reset. Please click on the following link to reset your password: ${resetURL}
     This link is valid for 10 minutes. If you did not request this, please ignore this email.`;
    await sendEmailToQueue({
      email: user.email,
      subject: "Password Reset Request",
      message,
    });

    res.status(200).json({
      success: true,
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
      const errorMessage = parsed.error.issues[0]?.message as string;
      throw createError(errorMessage, 400);
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

    res.status(200).json({ success: true });
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

    const payload: JWTPayload = {
      id: user.id,
      isEmailVerified: user.isEmailVerified,
      needToChangePassword: user.needToChangePassword,
      role: user.role!,
      provider: user.provider!,
      email: user.email,
    };

    generateAccessToken(payload, req, res);

    const { refreshToken, hashedRefreshToken } = generateRefreshToken();
    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiry(),
      },
    });

    sendRefreshToken(req, res, refreshToken);

    if (user.needToChangePassword) {
      return res.redirect(`${process.env.CLIENT_URL}/set-password`);
    }

    res.redirect(`${process.env.CLIENT_URL}/app`);
  } catch (error) {
    next(error);
  }
};

export const requestEmailVerification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.user?.isEmailVerified) {
      throw createError("Email already verified", 400);
    }

    await requestEmailVerificationService(req.user!.id, req.user!.email);

    res.status(200).json({
      success: true,
      message: `Verification code sent to ${maskEmail(req.user!.email)}`,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = emailVerificationTokenSchema.safeParse({
      token: req.body.token,
    });

    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message as string;
      throw createError(errorMessage, 400);
    }

    const { token } = parsed.data;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const emailVerificationToken =
      await prisma.emailVerificationToken.findUnique({
        where: { token: hashedToken },
      });

    if (
      !emailVerificationToken ||
      emailVerificationToken.expiresAt < new Date()
    ) {
      throw createError("Invalid or expired verification token", 400);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: emailVerificationToken.userId },
        data: { isEmailVerified: true },
      }),
      prisma.emailVerificationToken.delete({
        where: { id: emailVerificationToken.id },
      }),
    ]);

    const remainingTtl = req.user?.exp! - Math.floor(Date.now() / 1000);
    if (remainingTtl > 0) {
      await RedisClient.setex(
        `blacklist:${req.user?.jti}`,
        remainingTtl,
        "true",
      );
    }

    const payload: JWTPayload = {
      id: req.user!.id,
      isEmailVerified: true,
      needToChangePassword: req.user!.needToChangePassword,
      role: req.user!.role!,
      provider: req.user!.provider!,
      email: req.user!.email,
    };

    await generateAccessToken(payload, req, res);

    res
      .status(200)
      .json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};
