import { createExpenseSchema } from "../../validators/expense.validator";

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function daysFromToday(delta: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

describe("createExpenseSchema.date", () => {
  it("accepts today", () => {
    const result = createExpenseSchema.safeParse({ amount: 10, date: todayUtc() });
    expect(result.success).toBe(true);
  });

  it("accepts past dates", () => {
    const result = createExpenseSchema.safeParse({ amount: 10, date: daysFromToday(-1) });
    expect(result.success).toBe(true);
  });

  it("rejects future calendar days", () => {
    const result = createExpenseSchema.safeParse({ amount: 10, date: daysFromToday(1) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Date cannot be in the future");
  });
});
