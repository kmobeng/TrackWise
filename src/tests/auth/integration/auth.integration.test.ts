import request from "supertest";
import app from "../../../app";
import { prisma } from "../../../lib/prisma";

jest.mock("../../../utils/email.util", () => jest.fn().mockResolvedValue(undefined))

jest.mock("../../../middlewares/limiter.middleware", () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  loginLimiter: (_req: any, _res: any, next: any) => next(),
  resetPasswordLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../../../config/winston.config");

const TEST_EMAIL: string = "integration_test_user@test.com"

describe("Auth Integration - Sign Up", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should create a user and return 201", async () => {
    const res = await request(app).post("/api/v1/auth/signup").send({
      name: "Kenneth",
      email: TEST_EMAIL,
      password: "Password123!",
    });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(TEST_EMAIL);
    expect(res.body.data.password).toBeUndefined(); // password not exposed

    // verify user actually in DB
    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });
    expect(user).not.toBeNull();
  });

  it("should return 400 if user already exists", async () => {
    // first signup
    await request(app).post("/api/v1/auth/signup").send({
      name: "Kenneth",
      email: TEST_EMAIL,
      password: "Password123!",
    });

    // second signup with same email
    const res = await request(app).post("/api/v1/auth/signup").send({
      name: "Kenneth",
      email: TEST_EMAIL,
      password: "Password123!",
    });

    expect(res.status).toBe(400);
  });

  it("should return 400 if body is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .send({ email: "notanemail", password: "short" });

    expect(res.status).toBe(400);
  });
});
