import {
  groq,
  parseExtractedExpenseJson,
  extractExpenseDetails,
} from "../../utils/autoCategorize.util";

jest.mock("groq-sdk", () => {
  const create = jest.fn();
  return {
    __esModule: true,
    default: jest.fn(() => ({
      chat: { completions: { create } },
    })),
  };
});

const mockCreate = groq.chat.completions.create as jest.Mock;

describe("parseExtractedExpenseJson", () => {
  it("parses clean JSON", () => {
    const result = parseExtractedExpenseJson(
      '{"amount":12.5,"description":"Lunch","date":"2026-05-15","category":"Food"}',
    );

    expect(result).toEqual({
      amount: 12.5,
      description: "Lunch",
      date: "2026-05-15",
      category: "Food",
    });
  });

  it("parses JSON wrapped in markdown code fences", () => {
    const result = parseExtractedExpenseJson(
      '```json\n{"amount":12.5,"description":"Lunch","date":"2026-05-15","category":"Food"}\n```',
    );

    expect(result.amount).toBe(12.5);
    expect(result.category).toBe("Food");
  });

  it("parses JSON embedded in surrounding prose", () => {
    const result = parseExtractedExpenseJson(
      'Here you go: {"amount":12.5,"description":"Lunch","date":"2026-05-15","category":"Food"} Thanks!',
    );

    expect(result.amount).toBe(12.5);
  });

  it("throws a 502 for an empty response", () => {
    expect(() => parseExtractedExpenseJson("")).toThrow(
      expect.objectContaining({ statusCode: 502, isOperational: true }),
    );
  });

  it("throws a 422 for invalid JSON", () => {
    expect(() => parseExtractedExpenseJson("{amount: 12.5}")).toThrow(
      expect.objectContaining({ statusCode: 422, isOperational: true }),
    );
  });

  it("normalizes a string amount to a number", () => {
    const result = parseExtractedExpenseJson(
      '{"amount":"12.5","description":"Lunch","date":"2026-05-15","category":"Food"}',
    );

    expect(result.amount).toBe(12.5);
  });

  it("returns null amount for a non-numeric value", () => {
    const result = parseExtractedExpenseJson(
      '{"amount":"unknown","description":"Lunch","date":"2026-05-15","category":"Food"}',
    );

    expect(result.amount).toBeNull();
  });

  it("falls back to today for a missing or invalid date", () => {
    const result = parseExtractedExpenseJson(
      '{"amount":12.5,"description":"Lunch","date":"not-a-date","category":"Food"}',
    );

    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("extractExpenseDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls Groq with the active model id", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '{"amount":12.5,"description":"Lunch","date":"2026-05-15","category":"Food"}',
          },
        },
      ],
    });

    await extractExpenseDetails("Lunch for 12.5", ["Food", "Transport"]);

    expect(mockCreate.mock.calls[0][0].model).toBe("openai/gpt-oss-20b");
  });

  it("maps a Groq 404 model_not_found to a clear 502", async () => {
    mockCreate.mockRejectedValue({
      status: 404,
      message: "The model does not exist",
    });

    await expect(extractExpenseDetails("Lunch", ["Food"])).rejects.toMatchObject(
      {
        statusCode: 502,
        isOperational: true,
      },
    );
  });

  it("maps an abort/timeout to a 504", async () => {
    mockCreate.mockRejectedValue({ name: "AbortError" });

    await expect(extractExpenseDetails("Lunch", ["Food"])).rejects.toMatchObject(
      {
        statusCode: 504,
        isOperational: true,
      },
    );
  });
});
