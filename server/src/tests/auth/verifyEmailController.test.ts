import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";
import { verifyEmail } from "../../controllers/auth.controller";

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

const mockRequest = (body = {}) => ({ body }) as Request;
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

describe("Verify Email Controller", () => {
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

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });
});
