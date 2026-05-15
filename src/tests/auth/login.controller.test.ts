import * as authService from "../../services/auth.service";
import * as utils from "../../utils/auth.util";
import { login } from "../../controllers/auth.controller";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    refreshToken: { create: jest.fn() },
  },
}));

jest.mock("../../services/auth.service");
jest.mock("../../utils/auth.util");

const mockRequest = (body = {}) => ({ body }) as unknown as Request;

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookies = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

const mockLoginService = authService.loginService as jest.Mock;
const mockGenerateToken = utils.generateToken as jest.Mock;
const mockGenerateRefreshToken = utils.generateRefreshToken as jest.Mock;
const mockSendToken = utils.sendToken as jest.Mock;
const mockCreateRefreshToken = prisma.refreshToken.create as jest.Mock;

describe("Auth Controller - Login", () => {
  it("should return 400 if body validation fails", async () => {
    const req = mockRequest({
      email: "invalid-email",
      password: "short",
    });

    const res = mockResponse();
    await login(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
  });

  it("should return successful response if login is successful", async () => {
    const req = mockRequest({
      email: "test@gmail.com",
      password: "password123",
    });

    const res = mockResponse();

    mockLoginService.mockResolvedValue({
      id: 1,
      name: "Test User",
      email: "test@gmail.com",
    });

    mockGenerateToken.mockReturnValue(undefined);
    mockGenerateRefreshToken.mockReturnValue({
      token: "refresh-token",
      hashedToken: "hashed-refresh-token",
    });
    mockCreateRefreshToken.mockResolvedValue({
      id: 1,
      token: "hashed-refresh-token",
      userId: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    mockSendToken.mockReturnValue(undefined);

    await login(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.not.objectContaining({ password: expect.anything() }), // password excluded
      }),
    );
  });
});
