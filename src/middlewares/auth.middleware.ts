import { Request, Response, NextFunction } from "express";
import { createError } from "../utils/error.util";
import jwt from "jsonwebtoken";
import { RedisClient } from "../config/redis.config";

// definig jwt payload
export interface JWTPayload {
  id: string;
  isEmailVerified: boolean;
  needToChangePassword: boolean;
  role: string;
  provider: string;
  email: string;
  jti?: string;
  iat?: number;
  exp?: number;
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

    const isBlacklisted = await RedisClient.get(`blacklist:${decoded.jti}`);

    if (isBlacklisted) {
      throw createError("Session expired. Please login again to continue", 401);
    }

    req.user = { ...decoded };
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
