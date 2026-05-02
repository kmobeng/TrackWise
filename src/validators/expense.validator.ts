import { z } from "zod";

export const createExpenseSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
  description: z.string().optional(),
  date: z.coerce
    .date()
    .max(new Date(), { message: "Date cannot be in the future" }),
  categoryId: z.uuid({error: "Invalid category Id"}).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();
