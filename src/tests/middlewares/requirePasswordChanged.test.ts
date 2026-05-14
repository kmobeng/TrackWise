import { Request, Response, NextFunction } from "express";
import { requirePasswordChanged } from "../../middlewares/auth.middleware";

const mockRequest = (needToChangePassword: boolean) =>
  ({
    user: { needToChangePassword },
  }) as unknown as Request;

const mockResponse = () => ({}) as unknown as Response;

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

describe("requirePasswordChanged middleware", () => {
  it("should call next with 403 error if user need to change password", () => {
    const req = mockRequest(true);
    const res = mockResponse();

    requirePasswordChanged(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
      }),
    );
  });

  it("should call next without error if user does not need to change password", () => {
    const req = mockRequest(false);
    const res = mockResponse();

    requirePasswordChanged(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith(); // called without arguments means no
  });
});
