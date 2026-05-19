import { z } from "zod";

export const createBudgetSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
});

export const setCategoryBudgetSchema = z.object({
  categoryId: z.uuid("Invalid category ID"),
  amount: z.number().positive("Amount must be a positive number"),
});

export const deleteCategoryBudgetSchema = z.object({
  categoryId: z.uuid("Invalid category ID"),
});