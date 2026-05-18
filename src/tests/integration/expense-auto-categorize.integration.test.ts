import request from "supertest";
import jwt from "jsonwebtoken";
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

jest.mock("../../utils/autoCategorize.util", () => ({
  extractExpenseDetails: jest.fn().mockResolvedValue({
    amount: 12.5,
    description: "Lunch",
    date: "2026-05-15",
    category: "Food",
  }),
  groq: {},
}));

const TEST_EMAIL: string = "integration_test_user_auto_categorize@test.com";

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
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
};

describe("Expense Integration - Auto Categorize", () => {
  let accessToken: string;
  let userId: string;
  let foodCategoryId: string;

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

    const foodCategory = await prisma.category.findFirst({
      where: { name: "Food", isDefault: true },
    });
    if (!foodCategory) {
      throw new Error(
        "Default Food category is missing. Seed default categories before running tests.",
      );
    }
    foodCategoryId = foodCategory.id;

    const otherCategory = await prisma.category.findFirst({
      where: { name: "Other", isDefault: true },
    });
    if (!otherCategory) {
      throw new Error(
        "Default Other category is missing. Seed default categories before running tests.",
      );
    }

    await prisma.category.create({
      data: { name: "Travel", userId },
    });

    accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });
  });

  afterAll(async () => {
    await cleanupUserData(userId);
    await prisma.$disconnect();
  });

  it("returns extracted expense details with matched category", async () => {
    const res = await request(app)
      .post("/api/v1/expenses/auto-categorize")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ description: "Lunch for 12.5" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(12.5);
    expect(res.body.data.category.id).toBe(foodCategoryId);
    expect(res.body.data.category.name).toBe("Food");
  });
});
