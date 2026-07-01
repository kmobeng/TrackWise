import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { protect } from "../../middlewares/auth.middleware";
import { RedisClient } from "../../config/redis.config";

jest.mock("../../config/redis.config", () => ({
  RedisClient: {
    get: jest.fn(),
  },
}));

jest.mock("jsonwebtoken");

const mockJwtVerify = jwt.verify as jest.Mock;
const mockRedisGet = RedisClient.get as jest.Mock;

const mockRequest = (cookies = {}) => ({ cookies }) as unknown as Request;

const mockResponse = () => ({}) as unknown as Response;

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

describe("protect middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
  });

  it("should call next with 401 error if no token in cookies", async () => {
    const req = mockRequest({}); // no accessToken
    const res = mockResponse();

    await protect(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  it("should call next with error if token is invalid", async () => {
    const req = mockRequest({ accessToken: "invalidtoken" });
    const res = mockResponse();

    mockJwtVerify.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    await protect(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid token" }),
    );
  });

  it("should call next with 401 if token is blacklisted", async () => {
    const req = mockRequest({ accessToken: "validtoken" });
    const res = mockResponse();

    mockJwtVerify.mockReturnValue({
      id: "user-123",
      jti: "jti-1",
      iat: 0,
      exp: 0,
    });
    mockRedisGet.mockResolvedValue("true");

    await protect(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  it("should attach decoded payload to req.user and call next if token is valid", async () => {
    const req = mockRequest({ accessToken: "validtoken" });
    const res = mockResponse();

    mockJwtVerify.mockReturnValue({
      id: "user-123",
      email: "test@gmail.com",
      role: "user",
      isEmailVerified: true,
      needToChangePassword: false,
      provider: "local",
      jti: "jti-2",
      iat: 0,
      exp: 999999,
    });

    await protect(req, res, mockNext);

    expect(req.user).toMatchObject({
      id: "user-123",
      email: "test@gmail.com",
      role: "user",
      isEmailVerified: true,
      needToChangePassword: false,
      provider: "local",
      jti: "jti-2",
    });
    expect(mockNext).toHaveBeenCalledWith();
  });
});
