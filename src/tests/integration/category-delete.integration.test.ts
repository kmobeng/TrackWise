import request from "supertest";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";

process.env.NODE_ENV = "test";
process.env.COOKIE_KEY = process.env.COOKIE_KEY ?? "test-cookie-key";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret";

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

  await prisma.expense.deleteMany({ where: { userId } });
  await prisma.budget.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
};

describe("Category Integration - Delete", () => {
  let accessToken: string;
  let userId: string;
  let otherCategoryId: string;
  let deleteCategoryId: string;

  beforeAll(async () => {
    await ensureTestEmailAvailable();

    const user = await prisma.user.create({
      data: {
        name: "Category User",
        email: TEST_EMAIL,
        password: "hashed-password",
        isEmailVerified: true,
        needToChangePassword: false,
      },
    });
    userId = user.id;

    const otherCategory = await prisma.category.findFirst({
      where: { name: "Other", isDefault: true },
    });
    if (!otherCategory) {
      throw new Error(
        "Default Other category is missing. Seed default categories before running tests.",
      );
    }
    otherCategoryId = otherCategory.id;

    const userCategory = await prisma.category.create({
      data: { name: "Gym", userId },
    });
    deleteCategoryId = userCategory.id;

    const budget = await prisma.budget.create({
      data: { userId, amount: 10000 },
    });

    await prisma.categoryBudget.create({
      data: {
        budgetId: budget.id,
        categoryId: deleteCategoryId,
        amount: 2000,
      },
    });

    await prisma.expense.create({
      data: {
        userId,
        categoryId: deleteCategoryId,
        amount: 1500,
        description: "Gym fee",
        date: new Date(Date.UTC(2026, 4, 12)),
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

  it("deletes category and reassigns expenses", async () => {
    const res = await request(app)
      .delete(`/api/v1/categories/${deleteCategoryId}`)
      .set("Cookie", [`accessToken=${accessToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deletedCategory = await prisma.category.findUnique({
      where: { id: deleteCategoryId },
    });
    expect(deletedCategory).toBeNull();

    const expense = await prisma.expense.findFirst({
      where: { userId },
    });
    expect(expense).not.toBeNull();
    expect(expense!.categoryId).toBe(otherCategoryId);

    const categoryBudget = await prisma.categoryBudget.findFirst({
      where: { categoryId: deleteCategoryId },
    });
    expect(categoryBudget).toBeNull();
  });
});
