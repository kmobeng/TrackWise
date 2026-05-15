import { prisma } from "../../lib/prisma";
import * as utils from "../../utils/auth.util";
import { Request, Response } from "express";
import { refreshTokenService } from "../../services/auth.service";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    refreshToken: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("../../utils/auth.util");

const mockFindUnique = prisma.refreshToken.findUnique as jest.Mock;
const mockGenerateToken = utils.generateToken as jest.Mock;
const mockGenerateRefreshToken = utils.generateRefreshToken as jest.Mock;
const mockUpdate = prisma.refreshToken.update as jest.Mock;
const mockSendToken = utils.sendToken as jest.Mock;

describe("Refresh Token Service", () => {
  it("should throw an error if refresh token is invalid or expired", async () => {
    const hashedRefreshToken = "invalid-refresh-token";
    const req = {} as Request;
    const res = {} as Response;

    mockFindUnique.mockResolvedValue(null); // no token found

    await expect(
      refreshTokenService(hashedRefreshToken, req, res, new Date()),
    ).rejects.toThrow("Invalid or expired refresh token");
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { token: hashedRefreshToken },
      include: { user: true },
    });
  });

  it("should generate new access token and update refresh token if valid", async () => {
    const hashedRefreshToken = "valid-refresh-token";
    const req = {} as Request;
    const res = {} as Response;

    const user = { id: 1, name: "Test User", email: "test@gmail.com" };
    const storedToken = {
      token: hashedRefreshToken,
      userId :1,
      expiresAt: new Date(Date.now() + 10000),
      user,
    };

    mockFindUnique.mockResolvedValue(storedToken);
    mockGenerateToken.mockReturnValue(undefined);
    mockGenerateRefreshToken.mockReturnValue({
      refreshToken: "new-refresh-token",
      hashedRefreshToken: "new-hashed-refresh-token",
    });

    mockUpdate.mockResolvedValue(undefined);
    mockSendToken.mockReturnValue(undefined);

    await refreshTokenService(
      hashedRefreshToken,
      req,
      res,
      new Date(Date.now() + 10000),
    );

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { token: hashedRefreshToken },
      include: { user: true },
    });
    expect(mockGenerateToken).toHaveBeenCalledWith(user.id, req, res);
    expect(mockGenerateRefreshToken).toHaveBeenCalledWith();
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { token: hashedRefreshToken },
      data: { token: "new-hashed-refresh-token", expiresAt: expect.any(Date) },
    });
    expect(mockSendToken).toHaveBeenCalledWith( req, res,"new-refresh-token");
  });
});
