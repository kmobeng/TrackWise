import { prisma } from "../../lib/prisma";
import { requestEmailVerificationService } from "../../services/auth.service";
import { sendEmailToQueue } from "../../queues/email.queue";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    emailVerificationToken: {
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("../../queues/email.queue");
jest.mock("../../config/redis.config", () => ({
  RedisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue(null),
    quit: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
  },
}));

const mockupsert = prisma.emailVerificationToken.upsert as jest.Mock;
const mockDelete = prisma.emailVerificationToken.delete as jest.Mock;
const mockSendEmailToQueue = sendEmailToQueue as jest.Mock;

describe("Auth Service - Request Email Verification", () => {
  it("should throw if enqueueing the email fails", async () => {
    mockupsert.mockResolvedValue({});
    mockSendEmailToQueue.mockRejectedValue(new Error("Enqueue failed"));

    await expect(
      requestEmailVerificationService("1", "test@gmail.com"),
    ).rejects.toThrow("Enqueue failed");

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("should resolve successfully if the email is enqueued", async () => {
    mockupsert.mockResolvedValue({});
    mockSendEmailToQueue.mockResolvedValue(undefined);

    const results = await requestEmailVerificationService(
      "1",
      "test@gmail.com",
    );

    expect(results).toBeUndefined();

    expect(mockSendEmailToQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@gmail.com",
        subject: "Email Verification Code",
      }),
    );
    expect(mockDelete).not.toHaveBeenCalled();
  });
});