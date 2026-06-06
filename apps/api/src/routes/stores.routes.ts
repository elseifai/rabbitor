import { Router } from "express";
import { z } from "zod";
import { StoreType } from "@prisma/client";
import * as storeService from "../services/store.service";
import { authenticate, requireRoles, type AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/nearby", async (req, res, next) => {
  try {
    const schema = z.object({
      lat: z.coerce.number(),
      lng: z.coerce.number(),
      radiusKm: z.coerce.number().optional(),
      storeType: z.nativeEnum(StoreType).optional(),
      openOnly: z.coerce.boolean().optional().default(true),
    });
    const q = schema.parse(req.query);
    const stores = await storeService.findNearbyStores(q);
    res.json({ success: true, data: stores });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lng = req.query.lng ? Number(req.query.lng) : undefined;
    const store = await storeService.getStoreById(String(req.params.id), lat, lng);
    res.json({ success: true, data: store });
  } catch (e) {
    next(e);
  }
});

router.post("/", authenticate, requireRoles("VENDOR"), async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      storeType: z.nativeEnum(StoreType),
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().min(1),
      deliveryRadiusKm: z.number().optional(),
      minOrderValue: z.number().optional(),
      deliveryFee: z.number().optional(),
      preferredDelivery: z.enum(["SELF", "RABBITOR", "THIRD_PARTY"]).optional(),
    });
    const body = schema.parse(req.body);
    const store = await storeService.createStore(req.user!.sub, body);
    res.status(201).json({ success: true, data: store });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/open", authenticate, requireRoles("VENDOR"), async (req: AuthRequest, res, next) => {
  try {
    const { isOpen } = z.object({ isOpen: z.boolean() }).parse(req.body);
    const store = await storeService.setStoreOpen(req.user!.sub, String(req.params.id), isOpen);
    res.json({ success: true, data: store });
  } catch (e) {
    next(e);
  }
});

export default router;
