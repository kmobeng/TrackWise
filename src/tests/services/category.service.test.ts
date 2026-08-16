import { prisma } from "../../lib/prisma";
import { RedisClient } from "../../config/redis.config";
import { getDefaultCategoriesCached } from "../../services/category.service";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("../../config/redis.config", () => ({
  RedisClient: {
    get: jest.fn(),
    setex: jest.fn(),
    set: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
  },
}));

const mockFindMany = prisma.category.findMany as jest.Mock;
const mockGet = RedisClient.get as jest.Mock;
const mockSetex = RedisClient.setex as jest.Mock;

const categories = [
  { id: "1", name: "Food" },
  { id: "2", name: "Other" },
];

describe("Category Service - getDefaultCategoriesCached", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not cache an empty result", async () => {
    mockGet.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([]);

    const result = await getDefaultCategoriesCached();

    expect(result).toEqual([]);
    expect(mockSetex).not.toHaveBeenCalled();
  });

  it("should cache a non-empty result", async () => {
    mockGet.mockResolvedValue(null);
    mockFindMany.mockResolvedValue(categories);

    const result = await getDefaultCategoriesCached();

    expect(result).toEqual(categories);
    expect(mockSetex).toHaveBeenCalledWith(
      "categories:defaults",
      86400,
      JSON.stringify(categories),
    );
  });

  it("should return the cached result without querying the database", async () => {
    mockGet.mockResolvedValue(JSON.stringify(categories));

    const result = await getDefaultCategoriesCached();

    expect(result).toEqual(categories);
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});