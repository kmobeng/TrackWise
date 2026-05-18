import request from "supertest";
import app from "../../../app";
import { prisma } from "../../../lib/prisma";
import crypto from "crypto";

jest.mock("../../../middlewares/limiter.middleware", () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  loginLimiter: (_req: any, _res: any, next: any) => next(),
  resetPasswordLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../../../config/winston.config");

const TEST_EMAIL: string = "integration_test_user@test.com";

describe("Auth Integration - Refresh Token", () => {
  let userId: string;
  let rawRefreshToken: string;

  beforeAll(async () => {
    // create a test user
    const user = await prisma.user.create({
      data: {
        name: "Test User",
        email: TEST_EMAIL,
        password: "hashedpassword",
      },
    });
    userId = user.id;

    // create a real refresh token
    rawRefreshToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawRefreshToken)
      .digest("hex");

    await prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  it("should return 200 and rotate refresh token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [`refreshToken=${rawRefreshToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // verify old token was replaced in DB
    const oldToken = await prisma.refreshToken.findUnique({
      where: {
        token: crypto
          .createHash("sha256")
          .update(rawRefreshToken)
          .digest("hex"),
      },
    });
    expect(oldToken).toBeNull(); // old token gone
  });

  it("should return 401 if no refresh token in cookie", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");

    expect(res.status).toBe(401);
  });

  it("should return 401 if refresh token is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [`refreshToken=invalidtoken`]);

    expect(res.status).toBe(401);
  });
});
