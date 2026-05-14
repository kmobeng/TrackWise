import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { protect } from "../../middlewares/auth.middleware";
import { prisma } from "../../lib/prisma";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("jsonwebtoken");

const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockJwtVerify = jwt.verify as jest.Mock;

const mockRequest = (cookies = {}) => ({ cookies }) as unknown as Request;

const mockResponse = () => ({}) as unknown as Response;

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

describe("protect middleware", () => {
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

  it("should call next with 404 if user does not exist in DB", async () => {
    const req = mockRequest({ accessToken: "validtoken" });
    const res = mockResponse();

    mockJwtVerify.mockReturnValue({ id: "user-123", iat: 0, exp: 0 });
    mockFindUnique.mockResolvedValue(null); // user not found

    await protect(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it("should call next with 401 if password changed after token issued", async () => {
    const req = mockRequest({ accessToken: "validtoken" });
    const res = mockResponse();

    mockJwtVerify.mockReturnValue({ id: "user-123", iat: 1000, exp: 0 });
    mockFindUnique.mockResolvedValue({
      id: "user-123",
      email: "test@gmail.com",
      passwordChangedAt: new Date(999999999), // password changed after token issued
    });

    await protect(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  it("should attach user to req and call next if token is valid and user exists", async () => {
    const req = mockRequest({ accessToken: "validtoken" });
    const res = mockResponse();

    mockJwtVerify.mockReturnValue({ id: "user-123", iat: 0, exp: 0 });
    mockFindUnique.mockResolvedValue({
      id: "user-123",
      email: "test@gmail.com",
      role: "user",
      isEmailVerified: true,
      needToChangePassword: false,
      provider: "local",
      passwordChangedAt: null,
    });

    await protect(req, res, mockNext);

    expect(req.user).toMatchObject({
      id: "user-123",
      email: "test@gmail.com",
      role: "user",
      isEmailVerified: true,
      needToChangePassword: false,
      provider: "local",
    });
    expect(mockNext).toHaveBeenCalledWith();
  });
});
