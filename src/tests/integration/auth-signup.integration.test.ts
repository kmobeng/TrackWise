import request from "supertest";
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
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
};

describe("Auth Integration - Sign Up", () => {
  beforeAll(async () => {
    await ensureTestEmailAvailable();
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });
    await cleanupUserData(user?.id);
    await prisma.$disconnect();
  });

  it("creates a user and returns 201", async () => {
    const res = await request(app).post("/api/v1/auth/signup").send({
      name: "Kenneth",
      email: TEST_EMAIL,
      password: "Password123!",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(TEST_EMAIL);
    expect(res.body.data.password).toBeUndefined();

    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });
    expect(user).not.toBeNull();

    const refreshTokens = await prisma.refreshToken.findMany({
      where: { userId: user!.id },
    });
    expect(refreshTokens.length).toBe(1);

    const emailToken = await prisma.emailVerificationToken.findUnique({
      where: { userId: user!.id },
    });
    expect(emailToken).not.toBeNull();
  });

  it("returns 400 if user already exists", async () => {
    await request(app).post("/api/v1/auth/signup").send({
      name: "Kenneth",
      email: TEST_EMAIL,
      password: "Password123!",
    });

    const res = await request(app).post("/api/v1/auth/signup").send({
      name: "Kenneth",
      email: TEST_EMAIL,
      password: "Password123!",
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid request body", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .send({ email: "notanemail", password: "short" });

    expect(res.status).toBe(400);
  });
});
