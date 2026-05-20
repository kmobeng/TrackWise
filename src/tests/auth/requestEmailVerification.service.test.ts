import { prisma } from "../../lib/prisma";
import { requestEmailVerificationService } from "../../services/auth.service";
import sendEmail from "../../utils/email.util";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    emailVerificationToken: {
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("../../utils/email.util");
const mockupsert = prisma.emailVerificationToken.upsert as jest.Mock;
const mockDelete = prisma.emailVerificationToken.delete as jest.Mock;
const mockSendEmail = sendEmail as jest.Mock;

describe("Auth Service - Request Email Verification", () => {
  it("should return 500 if sending emails fail", async () => {
    mockupsert.mockResolvedValue({});
    mockSendEmail.mockRejectedValue(
      new Error("There was an error sending the email. Please try again later"),
    );

    await expect(
      requestEmailVerificationService("1", "test@gmail.com"),
    ).rejects.toThrow(
      "There was an error sending the email. Please try again later",
    );

    expect(mockDelete).toHaveBeenCalledWith({ where: { userId: "1" } });
  });

  it("should resolve successfully if email is sent", async () => {
    mockupsert.mockResolvedValue({});
    mockSendEmail.mockResolvedValue(undefined);

    const results = await requestEmailVerificationService(
      "1",
      "test@gmail.com",
    );

    expect(results).toBeUndefined();
  });
});
