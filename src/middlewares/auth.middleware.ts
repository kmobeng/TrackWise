import { Request, Response, NextFunction } from "express";
import { createError } from "../utils/error.util";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import logger from "../config/winston.config";

// definig jwt payload
interface JWTPayload {
  id: string;
  iat: number;
  exp: number;
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token: any;
    token = req.cookies.accessToken;
    if (!token) {
      throw createError("You are not logged in. Please login to continue", 401);
    }
    // decode jwt token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // check whether decoded userId is in the db
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!currentUser) {
      throw createError("User does not exist", 404);
    }

    // check if user changed password after the token was issued
    if (
      currentUser.passwordChangedAt &&
      decoded.iat < currentUser.passwordChangedAt.getTime() / 1000
    ) {
      throw createError("Password recently changed. Please login again", 401);
    }

    // attach current user to req.user
    req.user = {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role!,
      isEmailVerified: currentUser.isEmailVerified,
      needToChangePassword: currentUser.needToChangePassword,
      provider: currentUser.provider!,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role!)) {
      return next(
        createError("You do not have permission to accesss this action", 403),
      );
    }
    next();
  };
};

export const isEmailVerified = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user?.isEmailVerified) {
    return next(
      createError("Please verify your email to access this action", 403),
    );
  }
  next();
};

export const requirePasswordChanged = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.needToChangePassword) {
    return next(
      createError("Please set a password to perform this action", 403),
    );
  }
  next();
};
