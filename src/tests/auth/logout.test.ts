import { Request, Response, NextFunction } from "express";
import * as authService from "../../services/auth.service";
import { logout } from "../../controllers/auth.controller";

jest.mock("../../services/auth.service");

const mockRequest = (cookies = {}) =>
  ({
    cookies,
  }) as unknown as Request;
const mockResponse = () => {
  const res: any = {};
  res.clearCookie = jest.fn();
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

const mockLogoutService = authService.logoutService as jest.Mock;

describe("Auth Controller - Logout", () => {
  it("should return 401 if no refresh token is provided", async () => {
    const req = mockRequest();
    const res = mockResponse();

    await logout(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
      }),
    );
  });

  it("should return successful response if logout is successful", async () => {
    const req = mockRequest({ refreshToken: "valid-refresh-token" });
    const res = mockResponse();

    mockLogoutService.mockResolvedValue(true);

    await logout(req, res, mockNext);

    expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    expect(res.clearCookie).toHaveBeenCalledWith("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });
});
