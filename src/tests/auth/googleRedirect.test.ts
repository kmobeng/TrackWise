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
jest.mock("../../config/redis.config", () => ({
  RedisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue(null),
    quit: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
  },
}));

const mockRequest = (user = {}, authInfo = {}) =>
  ({ user, authInfo }) as unknown as Request;
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
const mockgenerateAccessToken = utils.generateAccessToken as jest.Mock;
const mockGenerateRefreshToken = utils.generateRefreshToken as jest.Mock;
const mocksendRefreshToken = utils.sendRefreshToken as jest.Mock;
const mockCreateRefreshToken = prisma.refreshToken.create as jest.Mock;

describe("Auth Controller - Google Redirect", () => {
  it("should return 200 if google redirect is successful for signup", async () => {
    const req = mockRequest(
      {
        id: 1,
        email: "test@gmail.com",
        isEmailVerified: true,
        needToChangePassword: false,
        role: "user",
        provider: "google",
      },
      { authAction: "signup" },
    );

    const res = mockResponse();
    mockgenerateAccessToken.mockReturnValue(undefined);
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
    mocksendRefreshToken.mockReturnValue(undefined);

    await googleRedirect(req, res, mockNext);

    expect(mockgenerateAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        email: "test@gmail.com",
        isEmailVerified: true,
        needToChangePassword: false,
        role: "user",
        provider: "google",
      }),
      req,
      res,
    );
    expect(mockGenerateRefreshToken).toHaveBeenCalled();
    expect(mockCreateRefreshToken).toHaveBeenCalledWith({
      data: {
        token: "hashed-refresh-token",
        userId: 1,
        expiresAt: expect.any(Date),
      },
    });
    expect(mocksendRefreshToken).toHaveBeenCalledWith(
      req,
      res,
      "refresh-token",
    );

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
      {
        id: 1,
        email: "test@gmail.com",
        isEmailVerified: true,
        needToChangePassword: false,
        role: "user",
        provider: "google",
      },
      { authAction: "login" },
    );
    const res = mockResponse();
    mockgenerateAccessToken.mockReturnValue(undefined);
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
    mocksendRefreshToken.mockReturnValue(undefined);

    await googleRedirect(req, res, mockNext);

    expect(mockgenerateAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        email: "test@gmail.com",
        isEmailVerified: true,
        needToChangePassword: false,
        role: "user",
        provider: "google",
      }),
      req,
      res,
    );
    expect(mockGenerateRefreshToken).toHaveBeenCalled();
    expect(mockCreateRefreshToken).toHaveBeenCalledWith({
      data: {
        token: "hashed-refresh-token",
        userId: 1,
        expiresAt: expect.any(Date),
      },
    });
    expect(mocksendRefreshToken).toHaveBeenCalledWith(
      req,
      res,
      "refresh-token",
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Logged in with Google successfully.",
      }),
    );
  });
});
