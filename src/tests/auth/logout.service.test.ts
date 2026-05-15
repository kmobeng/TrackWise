import { prisma } from "../../lib/prisma";
import { logoutService } from "../../services/auth.service";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    refreshToken: { delete: jest.fn() },
  },
}));

const mockDelete = prisma.refreshToken.delete as jest.Mock;

describe("Auth Service - Logout", () => {
  it("should delete the refresh token and return true", async () => {
    mockDelete.mockResolvedValue({});

    const result = await logoutService("hashed-refresh-token");

    expect(mockDelete).toHaveBeenCalledWith({
      where: { token: "hashed-refresh-token" },
    });
    expect(result).toBe(undefined);
  });
});
