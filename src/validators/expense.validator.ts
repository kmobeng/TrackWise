import { z } from "zod";

export const createExpenseSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
  description: z.string().optional(),
  date: z.coerce
    .date()
    .max(new Date(), { message: "Date cannot be in the future" }),
  categoryId: z.uuid({ error: "Invalid category Id" }).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const monthlyExpenseSummarySchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
});

export const dailyExpenseSummarySchema = monthlyExpenseSummarySchema;

export const getExpensesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.enum(["date", "amount", "category"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  desc: z.string().optional(), 
});