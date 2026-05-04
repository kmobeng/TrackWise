import { z } from "zod";

export const createBudgetSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
});

