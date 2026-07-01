import { z } from "zod";

export const updateMeSchema = z.object({
  name: z.string().min(1, "Name cannot be empty"),
});

export const updateEmailSchema = z.object({
  email : z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
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