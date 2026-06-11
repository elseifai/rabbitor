import { Router } from "express";
import { z } from "zod";
import { DeliveryMethod } from "@rabbit/database";
import * as orderService from "../services/order.service";
import {
  authenticate,
  isMerchantRole,
  isRiderRole,
  requireMerchantAccess,
  requireRiderAccess,
  requireRoles,
  type AuthRequest,
  type MerchantAuthRequest,
  type RiderAuthRequest,
} from "../middleware/auth";

const router = Router();

router.get("/", authenticate, requireRoles("CUSTOMER"), async (req: AuthRequest, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await orderService.listCustomerOrders(req.user!.sub, page, limit);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post("/", authenticate, requireRoles("CUSTOMER"), async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      storeId: z.string(),
      items: z.array(
        z.object({
          productId: z.string(),
          quantity: z.number().int().positive(),
        })
      ).min(1),
      deliveryMethod: z.nativeEnum(DeliveryMethod),
      deliveryAddress: z.string().min(1),
      couponCode: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const order = await orderService.createOrder(req.user!.sub, body);
    res.status(201).json({ success: true, data: order });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const order = await orderService.getOrderForUser(req.user!.sub, String(req.params.id));
    res.json({ success: true, data: order });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/status", authenticate, async (req: AuthRequest, res, next) => {
  const schema = z.object({
    status: z.enum([
      "ACCEPTED",
      "REJECTED",
      "PREPARING",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ]),
  });

  if (req.user && isMerchantRole(req.user.role)) {
    return requireMerchantAccess(req, res, async (merchantErr) => {
      if (merchantErr) return next(merchantErr);
      try {
        const merchantSchema = z.object({
          status: z.enum([
            "ACCEPTED",
            "REJECTED",
            "PREPARING",
            "OUT_FOR_DELIVERY",
            "CANCELLED",
          ]),
        });
        const { status } = merchantSchema.parse(req.body);
        const merchantReq = req as MerchantAuthRequest;
        const order = await orderService.updateMerchantOrderStatus(
          merchantReq.merchantStoreId,
          String(req.params.id),
          status,
        );
        res.json({ success: true, data: order });
      } catch (error) {
        next(error);
      }
    });
  }

  if (req.user && isRiderRole(req.user.role)) {
    return requireRiderAccess(req, res, async (riderErr) => {
      if (riderErr) return next(riderErr);
      try {
        const { status } = schema.parse(req.body);
        const riderReq = req as RiderAuthRequest;
        const order = await orderService.updateOrderStatus(
          riderReq.user.sub,
          riderReq.user.role,
          riderReq.riderOrderId,
          status,
        );
        res.json({ success: true, data: order });
      } catch (error) {
        next(error);
      }
    });
  }

  try {
    const { status } = schema.parse(req.body);
    const order = await orderService.updateOrderStatus(
      req.user!.sub,
      req.user!.role,
      String(req.params.id),
      status,
    );
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

export default router;
