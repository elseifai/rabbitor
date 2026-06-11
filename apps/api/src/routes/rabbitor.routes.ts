import { Router } from "express";
import { z } from "zod";
import * as rabbitorService from "../services/rabbitor.service";
import * as deliveryOfferService from "../services/delivery-offer.service";
import type { RiderDeliveryStage } from "../types/delivery";
import {
  authenticate,
  requireRiderAccess,
  requireRoles,
  type AuthRequest,
  type RiderAuthRequest,
} from "../middleware/auth";

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
  requireRiderAccess,
  async (req: AuthRequest, res, next) => {
    try {
      const riderReq = req as RiderAuthRequest;
      const job = await rabbitorService.getRabbitorJob(riderReq.user.sub, riderReq.riderOrderId);
      res.json({ success: true, data: job });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/earnings", authenticate, requireRoles("RABBITOR"), async (req: AuthRequest, res, next) => {
  try {
    const earnings = await rabbitorService.getRabbitorEarnings(req.user!.sub);
    res.json({ success: true, data: earnings });
  } catch (e) {
    next(e);
  }
});

router.get(
  "/active-delivery",
  authenticate,
  requireRoles("RABBITOR"),
  async (req: AuthRequest, res, next) => {
    try {
      const active = await deliveryOfferService.getActiveRiderDelivery(req.user!.sub);
      res.json({ success: true, data: active });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/offers/:orderId/accept",
  authenticate,
  requireRoles("RABBITOR"),
  async (req: AuthRequest, res, next) => {
    try {
      const job = await deliveryOfferService.acceptDeliveryOffer(
        req.user!.sub,
        String(req.params.orderId),
      );
      res.json({ success: true, data: job });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  "/orders/:id/stage",
  authenticate,
  requireRoles("RABBITOR"),
  requireRiderAccess,
  async (req: AuthRequest, res, next) => {
    try {
      const riderReq = req as RiderAuthRequest;
      const { stage } = z
        .object({
          stage: z.enum(["ARRIVED_AT_STORE", "PICKED_UP", "DELIVERED"]),
        })
        .parse(req.body);

      const result = await deliveryOfferService.updateRiderDeliveryStage(
        riderReq.user.sub,
        riderReq.riderOrderId,
        stage as RiderDeliveryStage,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
