import { prisma } from "../../lib/prisma";
import { RedisClient } from "../../config/redis.config";
import { createExpenseService } from "../../services/expense.service";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    expense: {
      create: jest.fn(),
    },
  },
}));

jest.mock("../../config/redis.config", () => ({
  RedisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
  },
}));

jest.mock("../../utils/autoCategorize.util", () => ({
  groq: {},
}));

const mockCreate = prisma.expense.create as jest.Mock;
const mockDel = RedisClient.del as jest.Mock;

const expense = (date: Date) => ({
  id: "expense-1",
  amount: 1000,
  description: "Groceries",
  date,
  categoryId: "category-1",
  userId: "user-1",
});

describe("Expense Service - cache invalidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("invalidates the current and following month summary keys after create", async () => {
    const date = new Date(Date.UTC(2026, 4, 5));
    mockCreate.mockResolvedValue(expense(date));

    await createExpenseService(1000, "Groceries", date, "category-1", "user-1");

    expect(mockDel).toHaveBeenCalledWith(
      "expense:monthly-summary:user-1:2026:5",
      "expense:monthly-summary:user-1:2026:6",
    );
  });

  it("rolls the following month over to January of the next year", async () => {
    const date = new Date(Date.UTC(2026, 11, 15));
    mockCreate.mockResolvedValue(expense(date));

    await createExpenseService(1000, "Groceries", date, "category-1", "user-1");

    expect(mockDel).toHaveBeenCalledWith(
      "expense:monthly-summary:user-1:2026:12",
      "expense:monthly-summary:user-1:2027:1",
    );
  });
});