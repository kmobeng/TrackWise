import { prisma } from "../../lib/prisma";
import { verifyEmailUpdateService } from "../../services/auth.service";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    emailVerificationToken: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockFindUnique = prisma.emailVerificationToken.findUnique as jest.Mock;
const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockDelete = prisma.emailVerificationToken.delete as jest.Mock;
const mockUserUpdate = prisma.user.update as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

describe("Verify Email Update Service", () => {
  it("should throw error if token is invalid or expired", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(
      verifyEmailUpdateService("user-id", "invalid-token"),
    ).rejects.toThrow("Invalid or expired token");
  });

  it("should throw error if there is no pending email update", async () => {
    mockFindUnique.mockResolvedValue({
      id: "token-id",
      userId: "user-id",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    mockUserFindUnique.mockResolvedValue({
      pendingEmail: null,
    });

    await expect(
      verifyEmailUpdateService("user-id", "valid-token"),
    ).rejects.toThrow("No pending email update");
  });

  it("should verify email update successfully", async () => {
    mockFindUnique.mockResolvedValue({
      id: "token-id",
      userId: "user-id",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    mockUserFindUnique.mockResolvedValue({
      pendingEmail: "test@gmail.com",
    });
    mockUserUpdate.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
    mockTransaction.mockResolvedValue([{}, {}]);

    await expect(
      verifyEmailUpdateService("user-id", "valid-token"),
    ).resolves.toBeUndefined();

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { token: "valid-token" },
    });
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: "user-id" },
      select: { pendingEmail: true },
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-id" },
      data: { email: "test@gmail.com", pendingEmail: null },
    });
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: "token-id" },
    });
    expect(mockTransaction).toHaveBeenCalled();
  });
});
