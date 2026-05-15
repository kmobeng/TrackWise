import { prisma } from "../../lib/prisma";
import { forgotPassword } from "../../controllers/auth.controller";
import { Request, Response, NextFunction } from "express";
import * as utils from "../../utils/email.util";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    passwordResetToken: {
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("../../utils/email.util");

const mockRequest = (body = {}) => ({
  body,
  protocol: "http",
  get: jest.fn().mockReturnValue("localhost:3000"),
}) as unknown as Request
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockUpsert = prisma.passwordResetToken.upsert as jest.Mock;
const mockSendEmail = utils.default as jest.Mock;

describe("Auth Controller - Forgot Password", () => {
  it("should return 400 if body validation fails", async () => {
    const req = mockRequest({
      email: "invalid-email",
    });
    const res = mockResponse();

    await forgotPassword(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
  });

  it("should return 404 if user with email does not exist", async () => {
    const req = mockRequest({
      email: "nonexistent@gmail.com",
    });
    const res = mockResponse();

    mockFindUnique.mockResolvedValue(null);

    await forgotPassword(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
      }),
    );
  });

  it("should return 500 if there is an error sending email", async () => {
    const req = mockRequest({
      email: "test@gmail.com",
    });
    const res = mockResponse();

    mockFindUnique.mockResolvedValue({ id: 1, email: "test@gmail.com" });
    mockUpsert.mockResolvedValue({});

    mockSendEmail.mockRejectedValue(new Error("Email sending failed"));

    await forgotPassword(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
      }),
    );

    expect(prisma.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { userId: 1 },
    });
  });

  it("should return 200 if forgot password is successful", async () => {
    const req = mockRequest({
      email: "test@gmail.com",
    });
    const res = mockResponse();

    mockFindUnique.mockResolvedValue({ id: 1, email: "test@gmail.com" });
    mockUpsert.mockResolvedValue({});
    mockSendEmail.mockResolvedValue(undefined);

    await forgotPassword(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });
});
