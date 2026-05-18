import request from "supertest";
import sendEmail from "../../utils/email.util";
import { prisma } from "../../lib/prisma";
import app from "../../app";

process.env.COOKIE_KEY = process.env.COOKIE_KEY ?? "test-cookie-key";

jest.mock("../../utils/email.util", () =>
  jest.fn().mockResolvedValue(undefined),
);

jest.mock("../../middlewares/limiter.middleware", () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  loginLimiter: (_req: any, _res: any, next: any) => next(),
  resetPasswordLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../../config/winston.config", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  },
}));

jest.mock("../../config/redis.config", () => ({
  RedisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue(null),
    quit: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
  },
}));

const TEST_EMAIL: string = "integration_test_user@test.com";

const ensureTestEmailAvailable = async () => {
  const existing = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
  });

  if (existing) {
    throw new Error(
      "TEST_EMAIL already exists in the database. Remove it or change TEST_EMAIL before running tests.",
    );
  }
};

const cleanupUserData = async (userId?: string) => {
  if (!userId) return;
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
};

describe("Auth Integration - Password Reset", () => {
  let userId: string;

  beforeAll(async () => {
    await ensureTestEmailAvailable();
    const user = await prisma.user.create({
      data: {
        name: "Test User",
        email: TEST_EMAIL,
        password: "old-password-hash",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await cleanupUserData(userId);
    await prisma.$disconnect();
  });

  it("issues a reset token and resets the password", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({
      email: TEST_EMAIL,
    });

    expect(res.status).toBe(200);

    const sendEmailMock = sendEmail as jest.Mock;
    const message = sendEmailMock.mock.calls[0][0].message as string;
    const match = message.match(/reset-password\/([a-f0-9]+)/i);
    expect(match).not.toBeNull();

    const rawToken = match![1];

    const resetRes = await request(app)
      .post(`/api/v1/auth/reset-password/${rawToken}`)
      .send({ password: "NewPassword123!" });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });
    expect(user).not.toBeNull();
    expect(user!.password).not.toBe("old-password-hash");
    expect(user!.passwordChangedAt).not.toBeNull();

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { userId: user!.id },
    });
    expect(tokenRecord).toBeNull();
  });
});
