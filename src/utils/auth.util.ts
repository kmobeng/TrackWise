import jwt, { SignOptions } from "jsonwebtoken";
import { Request, Response } from "express";
import crypto from "crypto";

const setAccessTokenCookieOptions = () => {
  const cookieOptions: any = {
    expires: new Date(
      Date.now() +
        Number(process.env.ACCESS_JWT_COOKIE_EXPIRES_IN) * 60 * 60 * 1000,
    ),
    // secure: true,
    httpOnly: true,
    // sameSite: "strict",
  };

  if (process.env.NODE_ENV === "production") {
    ((cookieOptions.secure = true), (cookieOptions.sameSite = "strict"));
  }
  return cookieOptions;
};

export const setRefreshTokenCookieOptions = () => {
  let RefreshCookieOptions: any = {
    expires: new Date(
      Date.now() +
        Number(process.env.REFRESH_JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000,
    ),
    // secure: true,
    httpOnly: true,
    // sameSite: "strict",
  };

  if (process.env.NODE_ENV === "production") {
    ((RefreshCookieOptions.secure = true),
      (RefreshCookieOptions.sameSite = "strict"));
  }

  return RefreshCookieOptions;
};

export const generateToken = (
  id: string,
  req: Request,
  res: Response,
): void => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN!,
  } as SignOptions);
  const accessTokenCookieOptions = setAccessTokenCookieOptions();
  res.cookie("accessToken", token, accessTokenCookieOptions);
};

export const sendToken = (
  req: Request,
  res: Response,
  refreshToken: string,
): void => {
  const refreshTokenCookieOptions = setRefreshTokenCookieOptions();

  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
};

export const generateRefreshToken = () => {
  const refreshToken = crypto.randomBytes(32).toString("hex");
  const hashedRefreshToken = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  return { refreshToken, hashedRefreshToken };
};
