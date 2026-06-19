import { Router } from "express";
import { z } from "zod";
import { UserEventType, type Prisma } from "@rabbit/database";
import { authenticate, optionalAuthenticate, requireRoles, type AuthRequest } from "../middleware/auth";
import * as analyticsService from "../services/analytics.service";

const router = Router();

router.post("/events", optionalAuthenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = z
      .object({
        eventType: z.nativeEnum(UserEventType),
        metadata: z.record(z.unknown()).optional(),
        sessionId: z.string().optional(),
      })
      .parse(req.body);

    const userId = req.user?.sub ?? null;
    const ipAddress =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      undefined;

    const event = await analyticsService.recordUserEvent({
      userId,
      eventType: body.eventType,
        metadata: body.metadata as Prisma.InputJsonValue | undefined,
      sessionId: body.sessionId,
      ipAddress,
    });

    res.status(201).json({ success: true, data: event });
  } catch (e) {
    next(e);
  }
});

router.put("/cart-snapshot", authenticate, requireRoles("CUSTOMER"), async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({ items: z.array(z.unknown()) }).parse(req.body);
    const snapshot = await analyticsService.upsertCartSnapshot(req.user!.sub, body.items);
    await analyticsService.recordUserEvent({
      userId: req.user!.sub,
      eventType: "CART_ADD",
      metadata: { itemCount: body.items.length },
    });
    res.json({ success: true, data: snapshot });
  } catch (e) {
    next(e);
  }
});

export default router;
