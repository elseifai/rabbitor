import type { Request, Response, NextFunction } from "express";
import { config } from "../config";

/** Protects internal broadcast routes — requires X-Internal-Secret header. */
export function requireInternalSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = config.internalApiSecret;
  if (!secret) {
    res.status(503).json({ success: false, error: "Internal API is not configured" });
    return;
  }

  const provided = req.headers["x-internal-secret"];
  if (provided !== secret) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  next();
}
