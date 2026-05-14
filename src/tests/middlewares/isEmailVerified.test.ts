import { Request, Response, NextFunction } from "express";
import { isEmailVerified } from "../../middlewares/auth.middleware";

const mockRequest = (isEmailVerified: boolean) =>
  ({
    user: { isEmailVerified },
  }) as unknown as Request;

const mockResponse = () => ({}) as unknown as Response;

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

describe("isEmailVerified middleware", () => {
  it("should call next with 403 error if email is not verified", () => {
    const req = mockRequest(false); // email not verified
    const res = mockResponse();

    isEmailVerified(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
      }),
    );
  });

  it("should call next without error if email is verified", () => {
    const req = mockRequest(true); // email verified
    const res = mockResponse();
    isEmailVerified(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(); // called without arguments means no error
  });
});
