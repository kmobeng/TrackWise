import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import { requestEmailVerificationService } from "./auth.service";
import { createError } from "../utils/error.util";
import sendEmail from "../utils/email.util";

export const getMeService = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
    return user;
  } catch (error) {
    throw error;
  }
};

export const updateMeService = async (
  userId: string,
  name?: string,
  email?: string,
) => {
  try {
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: {
          email,
        },
      });
      if (existingUser && existingUser.id !== userId) {
        throw createError("Email is already in use,", 400);
      }

      await requestEmailVerificationService(userId, email);

      const updatedUser = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          ...(name && { name }),
          pendingEmail: email,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });
      return {
        ...updatedUser,
        message: "Email change requested. Please verify your new email.",
      };
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(name && { name }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
    return updatedUser;
  } catch (error) {
    throw error;
  }
};

export const deleteMeService = async (userId: string) => {
  try {
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const changePasswordService = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        password: true,
        email: true,
      },
    });
    if (!user) {
      throw createError("User not found", 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw createError("Password is incorrect", 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });

    await sendEmail({
      email: user.email,
      subject: "Password Changed",
      message:
        "Your password has been changed successfully. If you did not perform this action, please contact support immediately.",
    });
  } catch (error) {
    throw error;
  }
};

export const setPasswordService = async (
  userId: string,
  newPassword: string,
  email: string,
) => {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: hashedPassword,
        needToChangePassword: false,
      },
    });

    await sendEmail({
      email, 
      subject: "Password Set Successfully",
      message: "You have successfully set a password for your account.",
    });
  } catch (error) {
    throw error;
  }
};
