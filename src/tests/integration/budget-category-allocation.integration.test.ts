import request from "supertest";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import app from "../../app";

jest.mock("../../utils/email.util");

jest.mock("../../config/winston.config");

jest.mock("../../middlewares/limiter.middleware", () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  loginLimiter: (_req: any, _res: any, next: any) => next(),
  resetPasswordLimiter: (_req: any, _res: any, next: any) => next(),
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

const TEST_EMAIL: string = "integration_test_user_budget_allocation@test.com";

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

  const budgets = await prisma.budget.findMany({
    where: { userId },
    select: { id: true },
  });
  const budgetIds = budgets.map((b) => b.id);

  if (budgetIds.length > 0) {
    await prisma.categoryBudget.deleteMany({
      where: { budgetId: { in: budgetIds } },
    });
  }

  await prisma.budget.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
};

describe("Budget Integration - Category Allocation", () => {
  let accessToken: string;
  let userId: string;
  let categoryAId: string;
  let categoryBId: string;

  beforeAll(async () => {
    await ensureTestEmailAvailable();

    const user = await prisma.user.create({
      data: {
        name: "Budget User",
        email: TEST_EMAIL,
        password: "hashed-password",
        isEmailVerified: true,
        needToChangePassword: false,
      },
    });
    userId = user.id;

    const categoryA = await prisma.category.create({
      data: { name: "Food", userId },
    });
    const categoryB = await prisma.category.create({
      data: { name: "Transport", userId },
    });
    categoryAId = categoryA.id;
    categoryBId = categoryB.id;

    const budget = await prisma.budget.create({
      data: { userId, amount: 10000 },
    });

    await prisma.categoryBudget.create({
      data: {
        budgetId: budget.id,
        categoryId: categoryAId,
        amount: 8000,
      },
    });

    accessToken = jwt.sign(
      {
        id: userId,
        email: TEST_EMAIL,
        role: "user",
        provider: "local",
        isEmailVerified: true,
        needToChangePassword: false,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "15m",
      },
    );
  });

  afterAll(async () => {
    await cleanupUserData(userId);
    await prisma.$disconnect();
  });

  it("returns 400 when allocation exceeds budget", async () => {
    const res = await request(app)
      .post("/api/v1/budget/category")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({
        categoryId: categoryBId,
        amount: 3000,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
