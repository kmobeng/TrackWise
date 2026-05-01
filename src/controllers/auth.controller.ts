import { Request, Response, NextFunction } from "express";
import { loginSchema, signUpSchema } from "../validators/auth.validator";
import { createError } from "../utils/error.util";
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import { loginService, signUpService } from "../services/auth.service";
import {
  generateRefreshToken,
  generateToken,
  sendToken,
} from "../utils/auth.util";

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

    const token = generateToken(newUser.id, req, res);

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
    res.status(201).json({ status: "success", token, data: user });
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

    const token = generateToken(user.id, req, res);

    const { refreshToken, hashedRefreshToken } = generateRefreshToken();
    await prisma.refreshToken.update({
      where: { userId: user.id },
      data: { token: hashedRefreshToken, expiresAt },
    })

    sendToken(req, res, refreshToken);

    const { password: _, ...userData } = user;
    res.status(200).json({ status: "success", token, data: userData });
    
  } catch (error) {
    next(error);
  }
};
