import { z } from "zod";

export const updateMeSchema = z.object({
  name: z.string().optional(),
  email: z.email().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long"),
});

export const setPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long"),
});