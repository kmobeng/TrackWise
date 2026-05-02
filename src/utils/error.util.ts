export class AppError extends Error {
  statusCode: number;
  success: false;
  isOperational: boolean;
  errorMessage: string;

  constructor(errorMessage: string, statusCode: number) {
    super(errorMessage);
    this.statusCode = statusCode;
    this.success = false;
    this.isOperational = true;
    this.errorMessage = errorMessage;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (errorMessage: string, statusCode: number) =>
  new AppError(errorMessage, statusCode);