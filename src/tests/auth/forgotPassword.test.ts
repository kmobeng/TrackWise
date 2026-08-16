import { prisma } from "../../lib/prisma";
import { forgotPassword } from "../../controllers/auth.controller";
import { Request, Response, NextFunction } from "express";
import { sendEmailToQueue } from "../../queues/email.queue";
import logger from "../../config/winston.config";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    passwordResetToken: {
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
jest.mock("../../config/winston.config", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../queues/email.queue");
jest.mock("../../config/redis.config", () => ({
  RedisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue(null),
    quit: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
  },
}));

const mockRequest = (body = {}) =>
  ({
    body,
    protocol: "http",
    get: jest.fn().mockReturnValue("localhost:3000"),
  }) as unknown as Request;
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockUpsert = prisma.passwordResetToken.upsert as jest.Mock;
const mockSendEmailToQueue = sendEmailToQueue as jest.Mock;

describe("Auth Controller - Forgot Password", () => {
  it("should return 400 if body validation fails", async () => {
    const req = mockRequest({
      email: "invalid-email",
    });
    const res = mockResponse();

    await forgotPassword(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
  });

  it("should return 200 if user with email does not exist", async () => {
    const req = mockRequest({
      email: "nonexistent@gmail.com",
    });
    const res = mockResponse();

    mockFindUnique.mockResolvedValue(null);

    await forgotPassword(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });

  it("should return 500 if there is an error enqueueing the email", async () => {
    const req = mockRequest({
      email: "test@gmail.com",
    });
    const res = mockResponse();

    mockFindUnique.mockResolvedValue({ id: 1, email: "test@gmail.com" });
    mockUpsert.mockResolvedValue({});
    mockSendEmailToQueue.mockRejectedValue(new Error("Enqueue failed"));

    await forgotPassword(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Enqueue failed",
      }),
    );

    expect(prisma.passwordResetToken.delete).not.toHaveBeenCalled();
  });

  it("should return 200 and enqueue the email if forgot password is successful", async () => {
    const req = mockRequest({
      email: "test@gmail.com",
    });
    const res = mockResponse();

    mockFindUnique.mockResolvedValue({ id: 1, email: "test@gmail.com" });
    mockUpsert.mockResolvedValue({});
    mockSendEmailToQueue.mockResolvedValue(undefined);

    await forgotPassword(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );

    expect(mockSendEmailToQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@gmail.com",
        subject: "Password Reset Request",
      }),
    );
    expect(prisma.passwordResetToken.delete).not.toHaveBeenCalled();
  });
});