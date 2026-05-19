import { Request, Response, NextFunction } from "express";
import logger from "../config/winston.config";
import { success } from "zod";

const sendErrorDev = (err: any, res: Response) => {
  res.status(err.statusCode).json({
    success: false,
    error: err.errorMessage,
    name: err.name,
    message: err.message,
    stack: err.stack,
    raw: err,
  });
};

const sendErrorProd = (err: any, res: Response) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.errorMessage,
    });
  }

  res.status(err.statusCode).json({
    success: false,
    error: "Something went wrong. Please try again later.",
  });
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = err.statusCode || err.status || 500;
  let errorMessage = err.errorMessage || "Internal server error";
  let isOperational = Boolean(err.isOperational);

  if (err.code === 11000) {
    statusCode = 400;
    isOperational = true;
    const duplicateField = Object.keys(err.keyPattern || {})[0];
    const duplicateValue = duplicateField
      ? err.keyValue?.[duplicateField]
      : undefined;

    errorMessage = `Duplicate field: ${duplicateField}: ${duplicateValue} already exists. Please use a different value.`;
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    isOperational = true;
    const errors = Object.values(err.errors).map((el: any) => el.message);
    errorMessage = errors.join(", ");
  }

  if (err.name === "CastError") {
    statusCode = 400;
    isOperational = true;
    errorMessage = `Invalid ${err.path}: ${err.value}`;
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    isOperational = true;
    errorMessage = "Invalid token. Please login again.";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    isOperational = true;
    errorMessage = "Token expired. Please login again.";
  }

  err.statusCode = statusCode;
  err.errorMessage = errorMessage;
  err.isOperational = isOperational;

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else {
    if (!err.isOperational) {
      logger.error(err.message || "Unhandled server error", {
        name: err.name,
        statusCode: err.statusCode,
        stack: err.stack,
      });
    }
    sendErrorProd(err, res);
  }
};
