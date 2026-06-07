import { Router } from "express";
import { z } from "zod";
import * as rabbitorService from "../services/rabbitor.service";
import { authenticate, requireRoles, type AuthRequest } from "../middleware/auth";

const router = Router();

router.patch(
  "/availability",
  authenticate,
  requireRoles("RABBITOR"),
  async (req: AuthRequest, res, next) => {
    try {
      const { isAvailable } = z.object({ isAvailable: z.boolean() }).parse(req.body);
      const profile = await rabbitorService.setRabbitorAvailability(
        req.user!.sub,
        isAvailable
      );
      res.json({ success: true, data: profile });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/orders", authenticate, requireRoles("RABBITOR"), async (req: AuthRequest, res, next) => {
  try {
    const jobs = await rabbitorService.listRabbitorJobs(req.user!.sub);
    res.json({ success: true, data: jobs });
  } catch (e) {
    next(e);
  }
});

router.get(
  "/orders/:id",
  authenticate,
  requireRoles("RABBITOR"),
  async (req: AuthRequest, res, next) => {
    try {
      const job = await rabbitorService.getRabbitorJob(req.user!.sub, String(req.params.id));
      res.json({ success: true, data: job });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/earnings", authenticate, requireRoles("RABBITOR"), async (req: AuthRequest, res, next) => {
  try {
    const earnings = await rabbitorService.getRabbitorEarnings(req.user!.sub);
    res.json({ success: true, data: earnings });
  } catch (e) {
    next(e);
  }
});

export default router;
