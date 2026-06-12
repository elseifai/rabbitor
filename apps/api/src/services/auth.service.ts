import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRole } from "@rabbit/database";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import type { JwtPayload } from "../middleware/auth";
import { conflict, unauthorized, badRequest } from "../lib/errors";
import { sendSms } from "../lib/sms";

const SALT_ROUNDS = 10;
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ACTIVE_CHALLENGES = 3;
const MAX_OTP_ATTEMPTS = 5;
/** DEV ONLY BYPASS — static OTP for seeded test accounts. */
const DEV_OTP = "123456";

function isDevOtpBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_DEV_OTP_BYPASS === "true"
  );
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  throw badRequest("Enter a valid 10-digit mobile number");
}

function generateOtpCode(): string {
  return randomInt(100000, 999999).toString();
}

export async function sendOtp(phone: string) {
  const normalized = normalizePhone(phone);

  const activeCount = await prisma.otpChallenge.count({
    where: {
      phone: normalized,
      verified: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (activeCount >= MAX_ACTIVE_CHALLENGES) {
    throw badRequest("Too many active OTP requests. Try again later.", "OTP_RATE_LIMITED");
  }

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);

  await prisma.otpChallenge.create({
    data: {
      phone: normalized,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendSms(
    normalized,
    `Your Rabbit OTP is ${code}. Valid for 10 minutes. Do not share.`
  );

  return { phone: normalized, expiresInMinutes: 10 };
}

export async function verifyOtp(phone: string, code: string) {
  const normalized = normalizePhone(phone);
  const trimmedCode = code.trim();

  // DEV ONLY BYPASS — intercept `123456`, skip SMS gateway, authenticate seeded user by phone.
  if (isDevOtpBypassEnabled() && trimmedCode === DEV_OTP) {
    const user = await prisma.user.findUnique({
      where: { phone: normalized },
      select: {
        id: true,
        phone: true,
        role: true,
        displayName: true,
      },
    });
    if (!user) {
      throw unauthorized("Test user not found. Run database seed.");
    }
    return { user, ...issueTokens(user) };
  }

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      phone: normalized,
      verified: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    throw unauthorized("OTP expired. Request a new one.");
  }

  if (challenge.expiresAt <= new Date()) {
    throw unauthorized("OTP expired. Request a new one.");
  }

  if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
    throw unauthorized("Too many attempts. Request a new OTP.");
  }

  const valid = await bcrypt.compare(trimmedCode, challenge.codeHash);
  if (!valid) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    throw unauthorized("Invalid OTP.");
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { verified: true },
  });

  const user = await prisma.user.upsert({
    where: { phone: normalized },
    update: {},
    create: {
      phone: normalized,
      name: `User ${normalized.slice(-4)}`,
      role: "CUSTOMER",
    },
    select: {
      id: true,
      phone: true,
      role: true,
      displayName: true,
    },
  });

  return {
    user,
    ...issueTokens(user),
  };
}

export async function registerUser(input: {
  phone: string;
  password: string;
  role: UserRole;
  displayName?: string;
  businessName?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existing) {
    throw conflict("Phone number already registered");
  }

  if (input.role === "VENDOR" && !input.businessName) {
    throw badRequest("businessName is required for vendor registration");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      phone: input.phone,
      name: input.displayName ?? input.phone,
      passwordHash,
      role: input.role,
      displayName: input.displayName,
      ...(input.role === "VENDOR" && {
        vendorProfile: {
          create: { businessName: input.businessName! },
        },
      }),
      ...(input.role === "RABBITOR" && {
        rabbitorProfile: { create: {} },
      }),
    },
    select: {
      id: true,
      phone: true,
      role: true,
      displayName: true,
    },
  });

  return { user, ...issueTokens(user) };
}

export async function loginUser(phone: string, password: string) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    throw unauthorized("Invalid phone or password");
  }

  const valid = await bcrypt.compare(password, user.passwordHash ?? "");
  if (!valid) {
    throw unauthorized("Invalid phone or password");
  }

  return {
    user: {
      id: user.id,
      phone: user.phone,
      role: user.role,
      displayName: user.displayName,
    },
    ...issueTokens(user),
  };
}

function issueTokens(user: { id: string; role: UserRole; phone: string | null }) {
  const payload: JwtPayload = {
    sub: user.id,
    role: user.role,
    phone: user.phone ?? "",
  };
  const accessToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
  return { accessToken, expiresIn: config.jwtExpiresIn };
}

export async function saveFcmToken(userId: string, fcmToken: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { fcmToken },
  });
  return { saved: true };
}
