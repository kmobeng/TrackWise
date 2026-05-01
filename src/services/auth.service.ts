import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import { createError } from "../utils/error.util";
import {
  generateRefreshToken,
  generateToken,
  sendToken,
} from "../utils/auth.util";

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
  req: any,
  res: any,
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
      where: { userId: storedToken.userId },
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
