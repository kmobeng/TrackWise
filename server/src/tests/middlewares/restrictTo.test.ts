import { Request, Response, NextFunction } from "express";
import { restrictTo } from "../../middlewares/auth.middleware";

const mockRequest = (role: string) =>
  ({
    user: { role },
  }) as unknown as Request;

const mockResponse = () => ({}) as unknown as Response;

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

describe("restrictTo middleware", () => {
  it("should call next with 403 error if user role is not allowed", () => {
    const req = mockRequest("manager"); // role not in allowed roles
    const res = mockResponse();

    restrictTo("admin", "user")(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: "You do not have permission to accesss this action",
      }),
    );
  });

  it("should call next without error if user role is allowed", () => {
    const req = mockRequest("admin"); // role in allowed roles
    const res = mockResponse();
    restrictTo("admin", "user")(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(); // called without arguments means no error
  });
});
