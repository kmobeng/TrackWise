import { Request, Response, NextFunction } from "express";
import {
  changePasswordService,
  deleteMeService,
  getMeService,
  setPasswordService,
  updateMeService,
} from "../services/user.service";
import {
  changePasswordSchema,
  setPasswordSchema,
  updateMeSchema,
} from "../validators/user.validators";
import { createError } from "../utils/error.util";
import { emailVerificationTokenSchema } from "../validators/auth.validator";
import crypto from "crypto";
import { verifyEmailUpdateService } from "../services/auth.service";

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const user = await getMeService(userId!);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }
    const userId = req.user?.id;
    const { name, email } = parsed.data;
    const updatedUser = await updateMeService(userId!, name, email);

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    await deleteMeService(userId!);

    res.status(204).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.user?.provider === "google") {
      throw createError(
        "You cannot change password for Google authenticated accounts",
        400,
      );
    }

    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }
    const userId = req.user?.id;
    const { currentPassword, newPassword } = parsed.data;

    await changePasswordService(userId!, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const setPassword = async(req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.provider !== "google") {
        throw createError(
            "This endpoint is only for Google authenticated accounts",
            400,
        );
    }

    const parsed = setPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        const errorMessages = parsed.error.issues            .map((err: any) => err.message)
            .join(", ");
        throw createError(errorMessages, 400);
    }
    const userId = req.user?.id;
    const { password } = parsed.data;

    await setPasswordService(userId!, password,req.user?.email!);

    res.status(200).json({
      success: true,
      message: "Password set successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmailUpdate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = emailVerificationTokenSchema.safeParse(req.body);
        if (!parsed.success) {
            const errorMessages = parsed.error.issues
                .map((err: any) => err.message)
                .join(", ");
            throw createError(errorMessages, 400);
        }

        const { token } = parsed.data;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    await verifyEmailUpdateService(req.user?.id!,hashedToken);

    res.status(200).json({
        success: true,
        message: "Email updated successfully",
    });
    } catch (error) {
        next(error);
    }
}