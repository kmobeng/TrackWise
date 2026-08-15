import { Request, Response, NextFunction } from "express";
import { createError } from "../utils/error.util";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

const originsMatch = (origin: string, allowed: string) => {
  try {
    return new URL(origin).origin === new URL(allowed).origin;
  } catch {
    return false;
  }
};

export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin ?? req.headers.referer;
  if (!origin) {
    return next();
  }

  const clientUrl = process.env.CLIENT_URL;
  if (clientUrl && originsMatch(origin, clientUrl)) {
    return next();
  }

  const apiOrigin = `${req.protocol}://${req.get("host")}`;
  if (originsMatch(origin, apiOrigin)) {
    return next();
  }

  return next(createError("Cross-origin request rejected", 403));
};