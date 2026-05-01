import { Request, Response, NextFunction } from "express";
import { loginSchema, signUpSchema } from "../validators/auth.validator";
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
    res.status(201).json({ status: "success", data: user });
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
    await prisma.refreshToken.upsert({
      where: { userId: user.id },
      update: { token: hashedRefreshToken, expiresAt },
      create: { token: hashedRefreshToken, userId: user.id, expiresAt },
    });

    sendToken(req, res, refreshToken);

    const { password: _, ...userData } = user;
    res.status(200).json({ status: "success",  data: userData });
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

    await refreshTokenService(
      hashedRefreshToken,
      req,
      res,
      expiresAt,
    );

    res.status(200).json({ status: "success" });
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

    res
      .status(200)
      .json({ status: "success", message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};
