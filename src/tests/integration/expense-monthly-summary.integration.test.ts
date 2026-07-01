import request from "supertest";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { RedisClient } from "../../config/redis.config";
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

const TEST_EMAIL: string = "integration_test_user_expense_summary@test.com";

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
  await prisma.expense.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
};

describe("Expense Integration - Monthly Summary", () => {
  let accessToken: string;
  let userId: string;
  let foodCategoryId: string;
  let transportCategoryId: string;

  beforeAll(async () => {
    await ensureTestEmailAvailable();

    const user = await prisma.user.create({
      data: {
        name: "Expense User",
        email: TEST_EMAIL,
        password: "hashed-password",
        isEmailVerified: true,
        needToChangePassword: false,
      },
    });
    userId = user.id;

    const foodCategory = await prisma.category.create({
      data: { name: "Food", userId },
    });
    const transportCategory = await prisma.category.create({
      data: { name: "Transport", userId },
    });
    foodCategoryId = foodCategory.id;
    transportCategoryId = transportCategory.id;

    await prisma.expense.createMany({
      data: [
        {
          userId,
          categoryId: foodCategoryId,
          amount: 2500,
          description: "Groceries",
          date: new Date(Date.UTC(2026, 4, 5)),
        },
        {
          userId,
          categoryId: transportCategoryId,
          amount: 1500,
          description: "Taxi",
          date: new Date(Date.UTC(2026, 4, 10)),
        },
        {
          userId,
          categoryId: foodCategoryId,
          amount: 1000,
          description: "April expense",
          date: new Date(Date.UTC(2026, 3, 20)),
        },
      ],
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
        expiresIn: "1h",
      },
    );
  });

  afterAll(async () => {
    await cleanupUserData(userId);
    await prisma.$disconnect();
  });

  it("returns a monthly summary and caches it", async () => {
    const res = await request(app)
      .get("/api/v1/expenses/summary?month=5&year=2026")
      .set("Cookie", [`accessToken=${accessToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalSpent).toBe(40);
    expect(res.body.data.previousMonthTotal).toBe(10);
    expect(res.body.data.mostSpentCategory.name).toBe("Food");

    expect(RedisClient.set).toHaveBeenCalled();
  });
});
