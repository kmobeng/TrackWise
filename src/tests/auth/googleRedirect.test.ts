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
  res.redirect = jest.fn().mockReturnValue(res);
  return res as Response;
};
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
const mockgenerateAccessToken = utils.generateAccessToken as jest.Mock;
const mockGenerateRefreshToken = utils.generateRefreshToken as jest.Mock;
const mocksendRefreshToken = utils.sendRefreshToken as jest.Mock;
const mockRefreshTokenExpiry = utils.refreshTokenExpiry as jest.Mock;
const mockCreateRefreshToken = prisma.refreshToken.create as jest.Mock;

const CLIENT_URL = "https://trackwise-gh.vercel.app";

describe("Auth Controller - Google Redirect", () => {
  it("should redirect to the set-password page when the user still needs to set a password", async () => {
    process.env.CLIENT_URL = CLIENT_URL;

    const req = mockRequest(
      {
        id: 1,
        email: "test@gmail.com",
        isEmailVerified: true,
        needToChangePassword: true,
        role: "user",
        provider: "google",
      },
      { authAction: "signup" },
    );

    const res = mockResponse();
    mockgenerateAccessToken.mockReturnValue(undefined);
    mockRefreshTokenExpiry.mockReturnValue(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );
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
        needToChangePassword: true,
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

    expect(res.redirect).toHaveBeenCalledWith(`${CLIENT_URL}/set-password`);
  });

  it("should redirect to the app dashboard when the user has a password set", async () => {
    process.env.CLIENT_URL = CLIENT_URL;

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
    mockRefreshTokenExpiry.mockReturnValue(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );
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

    expect(res.redirect).toHaveBeenCalledWith(`${CLIENT_URL}/app`);
  });
});