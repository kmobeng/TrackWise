import { prisma } from "../../lib/prisma";
import { signUp } from "../../controllers/auth.controller";
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import * as authService from "../../services/auth.service";
import * as tokenUtils from "../../utils/auth.util";
import * as emailService from "../../services/auth.service";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    refreshToken: { create: jest.fn() },
  },
}));

jest.mock("bcrypt");
jest.mock("../../services/auth.service");
jest.mock("../../utils/auth.util");
jest.mock("../../services/auth.service");

const mockFindUniqe = prisma.user.findUnique as jest.Mock;
const mockCreateRefreshToken = prisma.refreshToken.create as jest.Mock;
const mockHash = bcrypt.hash as jest.Mock;
const mockSignUpService = authService.signUpService as jest.Mock;
const mockGenerateToken = tokenUtils.generateToken as jest.Mock;
const mockGenerateRefreshToken = tokenUtils.generateRefreshToken as jest.Mock;
const mockSendToken = tokenUtils.sendToken as jest.Mock;
const requestEmailVerification =
  emailService.requestEmailVerificationService as jest.Mock;

const mockRequest = (body = {}) => ({ body }) as unknown as Request;

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

describe("Auth Controller - Sign Up", () => {
  it("should return 400 if body validation fails", async () => {
    const req = mockRequest({
      name: "",
      email: "invalid-email",
      password: "short",
    });

    const res = mockResponse();
    await signUp(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
  });

  it("should return 400 if user already exists", async () => {
    const req = mockRequest({
      name: "Test User",
      email: "test@gmail.com",
      password: "Password123!",
    });
    const res = mockResponse();

    mockFindUniqe.mockResolvedValue({
      id: "user-123",
      email: "test@gmail.com",
    });

    await signUp(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it("should create a new user and return success response", async () => {
    const req = mockRequest({
      name: "Test User",
      email: "test@gmail.com",
      password: "password123",
    });

    const res = mockResponse();

    mockFindUniqe.mockResolvedValue(null);
    mockHash.mockResolvedValue("hashedPassword");
    mockSignUpService.mockResolvedValue({
      id: 1,
      name: "Test User",
      email: "test@gmail.com",
    });
    mockGenerateToken.mockReturnValue(undefined);
    mockGenerateRefreshToken.mockReturnValue({
      refreshToken: "refreshToken",
      hashedToken: "hashedRefreshToken",
    });
    mockCreateRefreshToken.mockResolvedValue(undefined);
    mockSendToken.mockReturnValue(undefined);
    requestEmailVerification.mockResolvedValue(undefined);

    await signUp(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.not.objectContaining({ password: expect.anything() }), // password excluded
      }),
    );
  });
});
