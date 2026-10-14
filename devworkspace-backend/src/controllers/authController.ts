import type { Request, Response } from "express";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendVerificationEmail } from "../utils/sendEmail.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateTokens.js";
import { verifyTurnstile } from "../utils/verifyTurnstile.js";
import { toPublicUser } from "../utils/publicUser.js";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ACCESS_MAX_AGE = 15 * 60 * 1000;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const OTP_TTL = 10 * 60 * 1000;
const cookieOptions = { httpOnly: true, sameSite: "strict", secure: false } as const;

function setAccessCookie(res: Response, userId: string) {
  res.cookie("accessToken", generateAccessToken(userId), { ...cookieOptions, maxAge: ACCESS_MAX_AGE });
}

function setAuthCookies(res: Response, userId: string) {
  setAccessCookie(res, userId);
  res.cookie("refreshToken", generateRefreshToken(userId), { ...cookieOptions, maxAge: REFRESH_MAX_AGE });
}

/** Create a 6-digit code valid for 10 minutes and email it to the user. */
async function issueOtp(user: { id: string; email: string }) {
  const otp = randomInt(100000, 1000000).toString();
  await prisma.verificationToken.create({
    data: {
      email: user.email,
      userId: user.id,
      token: otp,
      expiresAt: new Date(Date.now() + OTP_TTL),
    },
  });
  await sendVerificationEmail(user.email, otp);
}

// ======================================================================
// 📌 SIGNUP (WITH EMAIL VERIFICATION)
// ======================================================================
export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, turnstileToken } = req.body;

  await verifyTurnstile(turnstileToken);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  // Create user (unverified)
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      provider: "credentials",
      isVerified: false,
    },
  });

  await issueOtp(user);
  res.status(201).json({ message: "Verification email sent", userId: user.id });
});

// ======================================================================
// 📌 VERIFY EMAIL (OTP)
// ======================================================================
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { userId, otp } = req.body;

  const record = await prisma.verificationToken.findFirst({
    where: {
      userId,
      token: otp,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isVerified: true },
  });

  await prisma.verificationToken.deleteMany({
    where: { userId },
  });

  setAuthCookies(res, userId);
  res.json({ message: "Email verified successfully", user: toPublicUser(user) });
});

// ======================================================================
// 📌 RESEND OTP
// ======================================================================
export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "UserId required" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await prisma.verificationToken.deleteMany({ where: { userId } });
  await issueOtp(user);
  res.json({ message: "New OTP sent" });
});

// ======================================================================
// 📌 LOGIN (WITH EMAIL + PASSWORD)
// ======================================================================
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, turnstileToken } = req.body;
  await verifyTurnstile(turnstileToken);

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  if (!user.isVerified) {
    return res.status(401).json({ message: "Email not verified" });
  }

  if (!user.password) {
    return res.status(400).json({ message: "Use Google Login" });
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  setAuthCookies(res, user.id);
  res.json({ message: "Login successful", user: toPublicUser(user) });
});

// ======================================================================
// 📌 GOOGLE LOGIN
// ======================================================================
export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ message: "Missing Google credential" });
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) return res.status(400).json({ message: "Invalid Google token" });

  let user = await prisma.user.findUnique({
    where: { email: payload.email! },
  });

  if (user && !user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: payload.sub!,
        provider: "google",
        isVerified: true,
        name: payload.name ?? user.name,
      },
    });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email!,
        googleId: payload.sub!,
        name: payload.name!,
        isVerified: true,
        provider: "google",
      },
    });
  }

  setAuthCookies(res, user.id);
  res.json({ user: toPublicUser(user) });
});

// ======================================================================
// 📌 REFRESH TOKEN (ISSUE NEW ACCESS TOKEN)
// ======================================================================
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;

  if (!token)
    return res.status(401).json({ message: "Refresh token missing" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    setAccessCookie(res, decoded.userId);
    res.json({ message: "Token refreshed" });
  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

// ======================================================================
// 📌 LOGOUT
// ======================================================================
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
});

export const me = (req: Request, res: Response) => {
  res.json({ user: req.user });
};
