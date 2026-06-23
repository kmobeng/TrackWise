import rateLimit, { Options } from "express-rate-limit";
import { NextFunction, Request,Response } from "express";

const rateLimitHandler: Partial<Options> = {
  handler: (req:Request, res:Response, next:NextFunction, options) => {
    res.status(429).json({
      success: false,
      message: options.message,
    });
  },
};

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    "Too many login requests from this IP, please try again in 15 minutes",...rateLimitHandler
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: "Too many requests from this IP, please try again in 1 minutes", ...rateLimitHandler
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 *1000,
  max: 5,
  message:"Too many forgot password request from this IP, pleae try again in 15 minutes", ...rateLimitHandler
});             