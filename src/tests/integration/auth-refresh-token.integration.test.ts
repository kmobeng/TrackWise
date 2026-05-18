import request from "supertest";
import crypto from "crypto";
import { prisma } from "../../lib/prisma";

process.env.NODE_ENV = "test";
process.env.COOKIE_KEY = process.env.COOKIE_KEY ?? "test-cookie-key";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";
process.env.ACCESS_JWT_COOKIE_EXPIRES_IN =
  process.env.ACCESS_JWT_COOKIE_EXPIRES_IN ?? "1";
process.env.REFRESH_JWT_COOKIE_EXPIRES_IN =
  process.env.REFRESH_JWT_COOKIE_EXPIRES_IN ?? "7";

jest.mock("../../utils/email.util", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
  maskEmail: (email: string) => email,
}));

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

const app = require("../../app").default;

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
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
};

describe("Auth Integration - Refresh Token", () => {
  let userId: string;
  let rawRefreshToken: string;
  let hashedRefreshToken: string;

  beforeAll(async () => {
    await ensureTestEmailAvailable();

    const user = await prisma.user.create({
      data: {
        name: "Test User",
        email: TEST_EMAIL,
        password: "hashedpassword",
      },
    });
    userId = user.id;

    rawRefreshToken = crypto.randomBytes(32).toString("hex");
    hashedRefreshToken = crypto
      .createHash("sha256")
      .update(rawRefreshToken)
      .digest("hex");

    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    await cleanupUserData(userId);
    await prisma.$disconnect();
  });

  it("rotates refresh token and sets cookies", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [`refreshToken=${rawRefreshToken}`]);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ success: true }));

    const rawSetCookie = res.headers["set-cookie"] ?? [];
    const setCookies = Array.isArray(rawSetCookie)
      ? rawSetCookie
      : [rawSetCookie];
    expect(setCookies.join("; ")).toContain("accessToken=");
    expect(setCookies.join("; ")).toContain("refreshToken=");

    const oldToken = await prisma.refreshToken.findUnique({
      where: { token: hashedRefreshToken },
    });
    expect(oldToken).toBeNull();
  });

  it("returns 401 if no refresh token is provided", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("returns 401 if refresh token is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", ["refreshToken=invalidtoken"]);

    expect(res.status).toBe(401);
  });
});
