export class AppError extends Error {
  statusCode: number;
  status: "fail" | "error";
  isOperational: boolean;
  errorMessage: string;

  constructor(errorMessage: string, statusCode: number) {
    super(errorMessage);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.errorMessage = errorMessage;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (errorMessage: string, statusCode: number) =>
  new AppError(errorMessage, statusCode);
