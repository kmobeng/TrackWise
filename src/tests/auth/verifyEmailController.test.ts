import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";
import { verifyEmail } from "../../controllers/auth.controller";
import { generateAccessToken } from "../../utils/auth.util";

jest.mock("../../utils/auth.util", () => ({
  generateAccessToken: jest.fn(),
}));

jest.mock("../../config/redis.config", () => ({
  RedisClient: {
    setex: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock("../../lib/prisma", () => ({
  prisma: {
    emailVerificationToken: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockRequest = (body = {}) =>
  ({
    body,
    user: {
      id: "user-id",
      email: "test@gmail.com",
      role: "user",
      provider: "local",
      isEmailVerified: false,
      needToChangePassword: false,
      jti: "jti-1",
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
  }) as unknown as Request;
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
const mockFindUnique = prisma.emailVerificationToken.findUnique as jest.Mock;
const mockDelete = prisma.emailVerificationToken.delete as jest.Mock;
const mockUserUpdate = prisma.user.update as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockGenerateAccessToken = generateAccessToken as jest.Mock;

describe("Verify Email Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if validation fails", async () => {
    const req = mockRequest({ token: "" });
    const res = mockResponse();

    await verifyEmail(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
  });

  it("should return 400 if token is invalid or expired", async () => {
    const req = mockRequest({ token: "invalid-token" });
    const res = mockResponse();

    mockFindUnique.mockResolvedValue(null);

    await verifyEmail(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
  });

  it("should verify email and return success message", async () => {
    const req = mockRequest({ token: "123456" });
    const res = mockResponse();

    mockFindUnique.mockResolvedValue({
      id: "token-id",
      userId: "user-id",
    });
    mockUserUpdate.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
    mockTransaction.mockResolvedValue([{}, {}]);

    await verifyEmail(req, res, mockNext);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { token: expect.any(String) },
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-id" },
      data: { isEmailVerified: true },
    });
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: "token-id" },
    });
    expect(mockGenerateAccessToken).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });
});
