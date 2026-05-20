import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import { createError } from "../utils/error.util";
import {
  generateRefreshToken,
  generateToken,
  sendToken,
} from "../utils/auth.util";
import sendEmail from "../utils/email.util";
import crypto from "crypto";
import { Request, Response } from "express";

export const signUpService = async (
  name: string,
  email: string,
  password: string,
) => {
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
      },
    });
    return user;
  } catch (error) {
    throw error;
  }
};

export const loginService = async (email: string, password: string) => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw createError("Incorrect email or password", 404);
    }

    return user;
  } catch (error) {
    throw error;
  }
};

export const refreshTokenService = async (
  hashedRefreshToken: string,
  req: Request,
  res: Response,
  expiresAt: Date,
) => {
  try {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: hashedRefreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw createError("Invalid or expired refresh token", 401);
    }

    generateToken(storedToken.userId, req, res);

    const {
      refreshToken: newRefreshToken,
      hashedRefreshToken: newHashedRefreshToken,
    } = generateRefreshToken();

    await prisma.refreshToken.update({
      where: { token: hashedRefreshToken },
      data: { token: newHashedRefreshToken, expiresAt },
    });

    sendToken(req, res, newRefreshToken);
  } catch (error) {
    throw error;
  }
};

export const logoutService = async (hashedRefreshToken: string) => {
  try {
    await prisma.refreshToken.delete({
      where: { token: hashedRefreshToken },
    });
  } catch (error) {
    throw error;
  }
};

export const requestEmailVerificationService = async (
  userId: string,
  email: string,
) => {
  try {
    const token = crypto.randomInt(100000, 999999).toString();

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    await prisma.emailVerificationToken.upsert({
      where: { userId },
      update: {
        token: hashedToken,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      create: {
        token: hashedToken,
        userId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    try {
      const message = `Your email verification code is: ${token}. This code is valid for 10 minutes. If you did not request this, please ignore this email.`;
      await sendEmail({
        email,
        subject: "Email Verification Code",
        message,
      });
    } catch (error) {
      await prisma.emailVerificationToken.delete({
        where: { userId },
      });
      throw createError(
        "There was an error sending the email. Please try again later.",
        500,
      );
    }
  } catch (error) {
    throw error;
  }
};

export const verifyEmailUpdateService = async (
  userId: string,
  token: string,
) => {
  try {
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      throw createError("Invalid or expired token", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pendingEmail: true },
    });
    if (!user?.pendingEmail) throw createError("No pending email update", 400);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { email: user.pendingEmail, pendingEmail: null },
      }),
      prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      }),
    ]);

    return;
  } catch (error) {
    throw error;
  }
};
