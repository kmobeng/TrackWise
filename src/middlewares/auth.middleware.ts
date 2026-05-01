import { Request, Response, NextFunction } from "express";
import { createError } from "../utils/error.util";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

// definig jwt payload
interface JWTPayload {
  id: string;
  iat: number;
  exp: number;
}

// extending request object to add req.user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token: any;
    // get bearer token from req.headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }else{
        token = req.cookies.accessToken
    }

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

    if (currentUser.passwordChangeAt) {
      if (decoded.iat < currentUser.passwordChangeAt.getTime() / 1000) {
        throw createError("Password recently changed. Please login again", 401);
      }
    }

    // attach current user to req.user
    req.user = {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role!,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role!)) {
      return next(
        createError("You do not have permission to accesss this action", 403),
      );
    }
    next();
  };
};
