import { Request, Response, NextFunction } from "express";
import * as authService from "../../services/auth.service";
import { requestEmailVerification } from "../../controllers/auth.controller";
import { success } from "zod";

jest.mock("../../services/auth.service");

const mockRequest = (user = {}) => ({ user }) as unknown as Request;
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
const mockRequestEmailVerificationService =
  authService.requestEmailVerificationService as jest.Mock;

describe("Auth Controller - Request Email Verification", () => {
  it("should return 400 if user is already verified", async () => {
    const req = mockRequest({
      id: 1,
      email: "test@gmail.com",
      isEmailVerified: true,
    });
    const res = mockResponse();
    await requestEmailVerification(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
  });

  it("should return 200 if email verification request is successful", async () => {
    const req = mockRequest({
      id: 1,
      email: "test@gmail.com",
      isEmailVerified: false,
    });
    const res = mockResponse();
    mockRequestEmailVerificationService.mockResolvedValue(undefined);
    await requestEmailVerification(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });
});
