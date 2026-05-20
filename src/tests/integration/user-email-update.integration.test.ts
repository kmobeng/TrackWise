import request from "supertest";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import app from "../../app";

jest.mock("../../utils/email.util");

jest.mock("../../middlewares/limiter.middleware", () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  loginLimiter: (_req: any, _res: any, next: any) => next(),
  resetPasswordLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../../config/winston.config");

jest.mock("../../config/redis.config", () => ({
  RedisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue(null),
    quit: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
  },
}));

const TEST_EMAIL: string = "integration_test_user_email_update@test.com";
const NEW_EMAIL: string = "integration_test_user_email_update_new@test.com";

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
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
};

describe("User Integration - Verify Email Update", () => {
  let accessToken: string;
  let userId: string;
  let rawToken: string;

  beforeAll(async () => {
    await ensureTestEmailAvailable();

    const user = await prisma.user.create({
      data: {
        name: "User",
        email: TEST_EMAIL,
        password: "hashed-password",
        isEmailVerified: true,
        needToChangePassword: false,
        pendingEmail: NEW_EMAIL,
      },
    });
    userId = user.id;

    rawToken = crypto.randomInt(100000, 999999).toString();

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await prisma.emailVerificationToken.create({
      data: {
        userId,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });
  });

  afterAll(async () => {
    await cleanupUserData(userId);
    await prisma.$disconnect();
  });

  it("updates user email and clears pending email", async () => {
    const res = await request(app)
      .post("/api/v1/users/verify-email-update")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ token: rawToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    expect(updatedUser!.email).toBe(NEW_EMAIL);
    expect(updatedUser!.pendingEmail).toBeNull();

    const tokenRecord = await prisma.emailVerificationToken.findUnique({
      where: { userId },
    });
    expect(tokenRecord).toBeNull();
  });
});
