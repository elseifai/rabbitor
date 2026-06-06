import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import type { JwtPayload } from "../middleware/auth";
import { conflict, unauthorized, badRequest } from "../lib/errors";

const SALT_ROUNDS = 10;

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

  const valid = await bcrypt.compare(password, user.passwordHash);
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

function issueTokens(user: { id: string; role: UserRole; phone: string }) {
  const payload: JwtPayload = { sub: user.id, role: user.role, phone: user.phone };
  const accessToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
  return { accessToken, expiresIn: config.jwtExpiresIn };
}
