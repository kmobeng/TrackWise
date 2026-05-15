import { resetPassword } from "../../controllers/auth.controller";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    passwordResetToken: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock("bcrypt");

const mockRequest = (body = {}, params = {}) =>
  ({ body, params }) as unknown as Request;
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

const mockFindUnique = prisma.passwordResetToken.findUnique as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockHash = bcrypt.hash as jest.Mock;
const mockUserUpdate = prisma.user.update as jest.Mock;
const mockDelete = prisma.passwordResetToken.delete as jest.Mock;

describe("Auth Controller - Reset Password", () => {
  it("should return 400 if body validation fails", async () => {
    const req = mockRequest(
      {
        newPassword: "short",
      },
      { token: "invalid-token" },
    );
    const res = mockResponse();

    await resetPassword(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
  });

  it("should return 400 if token is invalid or expired", async () => {
    const req = mockRequest(
      {
        newPassword: "newPassword123",
      },
      { token: "valid-token" },
    );
    const res = mockResponse();

    mockFindUnique.mockResolvedValue(null);

    await resetPassword(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
  });

  it("should return 200 if password reset is successful", async () => {
    const req = mockRequest(
      {
        password: "newPassword123",
      },
      { token: "valid-token" },
    );
    const res = mockResponse();

    mockFindUnique.mockResolvedValue({
      id: 1,
      userId: 1,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // valid for 1 hour
    });
    mockHash.mockResolvedValue("hashed-new-password");
    mockUserUpdate.mockResolvedValue({
      id: 1,
      password: "hashed-new-password",
    });
    mockDelete.mockResolvedValue({});
    mockTransaction.mockResolvedValue([{}, {}]);

    await resetPassword(req, res, mockNext);

    expect(mockHash).toHaveBeenCalledWith("newPassword123", 12);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        password: "hashed-new-password",
        passwordChangedAt: expect.any(Date),
      },
    });
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });
});
