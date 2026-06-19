import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { OrderStatus, UserRole } from "@rabbit/database";
import { config } from "../config";
import { unauthorized, forbidden, badRequest } from "../lib/errors";
import { prisma } from "../lib/prisma";

export interface JwtPayload {
  sub: string;
  role: UserRole;
  phone: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/** Request context after `requireMerchantAccess` (VENDOR / MERCHANT role). */
export interface MerchantAuthRequest extends AuthRequest {
  user: JwtPayload;
  merchantStoreId: string;
}

/** Request context after `requireRiderAccess` (RABBITOR / delivery partner role). */
export interface RiderAuthRequest extends AuthRequest {
  user: JwtPayload;
  riderOrderId: string;
}

/** Active delivery assignments eligible for rider location / stage updates. */
export const ACTIVE_RIDER_ORDER_STATUSES: OrderStatus[] = [
  "ACCEPTED_BY_SHOP",
  "PREPARING",
  "OUT_FOR_DELIVERY",
];

const MERCHANT_ROLES: UserRole[] = ["VENDOR"];
const RIDER_ROLES: UserRole[] = ["RABBITOR"];

function extractOrderId(req: Request): string | null {
  const fromParams = req.params.orderId ?? req.params.id;
  if (typeof fromParams === "string" && fromParams.length > 0) {
    return fromParams;
  }

  const body = req.body as { orderId?: unknown } | undefined;
  if (typeof body?.orderId === "string" && body.orderId.length > 0) {
    return body.orderId;
  }

  return null;
}

export function isMerchantRole(role: UserRole): boolean {
  return MERCHANT_ROLES.includes(role);
}

export function isRiderRole(role: UserRole): boolean {
  return RIDER_ROLES.includes(role);
}

export function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(unauthorized("Missing or invalid token"));
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

/** Sets `req.user` when a valid Bearer token is present; does not fail when absent. */
export function optionalAuthenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = payload;
  } catch {
    // ignore invalid optional tokens
  }
  next();
}

export function requireRoles(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(forbidden("Insufficient permissions"));
    }
    next();
  };
}

/**
 * Ensures the caller is a merchant (VENDOR) and resolves their shop into `req.merchantStoreId`.
 * Prevents horizontal privilege escalation across competing stores.
 */
export async function requireMerchantAccess(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      return next(unauthorized());
    }

    if (!isMerchantRole(req.user.role)) {
      return next(forbidden("Merchant access only"));
    }

    const store = await prisma.shop.findFirst({
      where: {
        OR: [
          { ownerId: req.user.sub },
          { vendor: { userId: req.user.sub } },
        ],
      },
      select: { id: true },
    });

    if (!store) {
      return next(forbidden("No store linked to this merchant account"));
    }

    (req as MerchantAuthRequest).merchantStoreId = store.id;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Ensures the caller is a delivery partner (RABBITOR) and that `orderId` is actively assigned to them.
 */
export async function requireRiderAccess(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      return next(unauthorized());
    }

    if (!isRiderRole(req.user.role)) {
      return next(forbidden("Delivery partner access only"));
    }

    const orderId = extractOrderId(req);
    if (!orderId) {
      return next(badRequest("orderId is required"));
    }

    const assignment = await prisma.order.findFirst({
      where: {
        id: orderId,
        deliveryPartnerId: req.user.sub,
        status: { in: ACTIVE_RIDER_ORDER_STATUSES },
      },
      select: { id: true },
    });

    if (!assignment) {
      return next(
        forbidden("Order is not assigned to you or is no longer an active delivery"),
      );
    }

    (req as RiderAuthRequest).riderOrderId = orderId;
    next();
  } catch (error) {
    next(error);
  }
}
