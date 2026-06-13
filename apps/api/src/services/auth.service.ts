import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRole } from "@rabbit/database";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import type { JwtPayload } from "../middleware/auth";
import { conflict, unauthorized, badRequest } from "../lib/errors";
import { sendSms } from "../lib/sms";
import {
  GoogleAuthRoleMismatchError,
  isAllowedMobileRedirectUri,
  isPrivilegedRole,
} from "../lib/google-auth";

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

type GoogleProfile = {
  googleId: string;
  email: string;
  name?: string | null;
  picture?: string | null;
};

async function upsertGoogleUser(profile: GoogleProfile, role?: UserRole) {
  const email = profile.email.toLowerCase();
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: profile.googleId }, { email }] },
  });

  if (user && role && isPrivilegedRole(role) && user.role !== role) {
    throw new GoogleAuthRoleMismatchError(role, user.role);
  }

  const displayName = profile.name?.trim() || email.split("@")[0];

  if (!user) {
    user = await prisma.user.create({
      data: {
        googleId: profile.googleId,
        email,
        emailVerified: new Date(),
        name: displayName,
        displayName,
        avatarUrl: profile.picture ?? null,
        role: role ?? "CUSTOMER",
        ...(role === "RABBITOR" && { rabbitorProfile: { create: {} } }),
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: user.googleId ?? profile.googleId,
        emailVerified: user.emailVerified ?? new Date(),
        name: profile.name?.trim() || user.name,
        displayName: profile.name?.trim() || user.displayName,
        avatarUrl: profile.picture ?? user.avatarUrl,
      },
    });
  }

  return user;
}

export async function googleSignIn(input: {
  code: string;
  redirectUri: string;
  role?: "CUSTOMER" | "RABBITOR";
}) {
  if (!isAllowedMobileRedirectUri(input.redirectUri)) {
    throw badRequest("Invalid redirect URI.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw badRequest("Google sign-in is not configured.");
  }

  const role = input.role ?? "CUSTOMER";

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    throw unauthorized("Could not verify your Google account.");
  }

  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) {
    throw unauthorized("Could not verify your Google account.");
  }

  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) {
    throw unauthorized("Could not read your Google profile.");
  }

  const profile = (await profileRes.json()) as {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  if (!profile.email) {
    throw badRequest("Your Google account has no email.");
  }

  let user;
  try {
    user = await upsertGoogleUser(
      {
        googleId: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
      role,
    );
  } catch (err) {
    if (err instanceof GoogleAuthRoleMismatchError) {
      const messages: Record<UserRole, string> = {
        CUSTOMER: "This app is for customers only.",
        VENDOR: "This email is not registered as a merchant.",
        RABBITOR: "This app is for Rabbit delivery partners only.",
        ADMIN: "This email is not registered as admin.",
      };
      throw unauthorized(messages[err.expectedRole] ?? "Access denied for this role.");
    }
    throw err;
  }

  if (user.role !== role) {
    const messages: Record<string, string> = {
      CUSTOMER: "This app is for customers only.",
      RABBITOR: "This app is for Rabbit delivery partners only.",
    };
    throw unauthorized(messages[role] ?? "Access denied for this role.");
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
