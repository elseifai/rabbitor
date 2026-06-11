import jwt from "jsonwebtoken";
import type { Socket } from "socket.io";
import { config } from "../config";
import type { JwtPayload } from "../middleware/auth";

type RawTokenPayload = JwtPayload & { userId?: string };

export function normalizeSocketUser(payload: RawTokenPayload): JwtPayload {
  return {
    sub: payload.sub ?? payload.userId ?? "",
    role: payload.role,
    phone: payload.phone ?? "",
  };
}

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const token = socket.handshake.auth.token;
  if (!token || typeof token !== "string") {
    return next(new Error("Unauthorized"));
  }
  try {
    const raw = jwt.verify(token, config.jwtSecret) as RawTokenPayload;
    const user = normalizeSocketUser(raw);
    if (!user.sub) {
      return next(new Error("Unauthorized"));
    }
    socket.data.user = user;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
}
