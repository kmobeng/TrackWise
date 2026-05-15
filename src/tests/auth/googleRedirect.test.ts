import { Request, Response, NextFunction } from "express";
import * as utils from "../../utils/auth.util";
import { googleRedirect } from "../../controllers/auth.controller";
import { prisma } from "../../lib/prisma";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    refreshToken: {
      create: jest.fn(),
    },
  },
}));

jest.mock("../../utils/auth.util");

const mockRequest = (user = {}, authInfo = {}) =>
  ({ user, authInfo }) as unknown as Request;
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
const mockGenerateToken = utils.generateToken as jest.Mock;
const mockGenerateRefreshToken = utils.generateRefreshToken as jest.Mock;
const mockSendToken = utils.sendToken as jest.Mock;
const mockCreateRefreshToken = prisma.refreshToken.create as jest.Mock;

describe("Auth Controller - Google Redirect", () => {
  it("should return 200 if google redirect is successful for signup", async () => {
    const req = mockRequest(
      { id: 1, email: "test@gmail.com" },
      { authAction: "signup" },
    );

    const res = mockResponse();
    mockGenerateToken.mockReturnValue(undefined);
    mockGenerateRefreshToken.mockReturnValue({
      refreshToken: "refresh-token",
      hashedRefreshToken: "hashed-refresh-token",
    });
    mockCreateRefreshToken.mockResolvedValue({
      id: 1,
      token: "hashed-refresh-token",
      userId: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    mockSendToken.mockReturnValue(undefined);

    await googleRedirect(req, res, mockNext);

    expect(mockGenerateToken).toHaveBeenCalledWith(1, req, res);
    expect(mockGenerateRefreshToken).toHaveBeenCalled();
    expect(mockCreateRefreshToken).toHaveBeenCalledWith({
      data: {
        token: "hashed-refresh-token",
        userId: 1,
        expiresAt: expect.any(Date),
      },
    });
    expect(mockSendToken).toHaveBeenCalledWith(req, res, "refresh-token");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message:
          "Account created with Google. Please set password to continue.",
      }),
    );
  });

  it("should return 200 if google redirect is successful for login", async () => {
    const req = mockRequest(
      { id: 1, email: "test@gmail.com" },
      { authAction: "login" },
    );
    const res = mockResponse();
    mockGenerateToken.mockReturnValue(undefined);
    mockGenerateRefreshToken.mockReturnValue({
      refreshToken: "refresh-token",
      hashedRefreshToken: "hashed-refresh-token",
    });
    mockCreateRefreshToken.mockResolvedValue({
      id: 1,
      token: "hashed-refresh-token",
      userId: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    mockSendToken.mockReturnValue(undefined);

    await googleRedirect(req, res, mockNext);

    expect(mockGenerateToken).toHaveBeenCalledWith(1, req, res);
    expect(mockGenerateRefreshToken).toHaveBeenCalled();
    expect(mockCreateRefreshToken).toHaveBeenCalledWith({
      data: {
        token: "hashed-refresh-token",
        userId: 1,
        expiresAt: expect.any(Date),
      },
    });
    expect(mockSendToken).toHaveBeenCalledWith(req, res, "refresh-token");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Logged in with Google successfully.",
      }),
    );
  });
});
