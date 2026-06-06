import { Router } from "express";
import { z } from "zod";
import { DeliveryMethod } from "@prisma/client";
import * as orderService from "../services/order.service";
import { authenticate, requireRoles, type AuthRequest } from "../middleware/auth";

const router = Router();

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
  try {
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
    const { status } = schema.parse(req.body);
    const order = await orderService.updateOrderStatus(
      req.user!.sub,
      req.user!.role,
      String(req.params.id),
      status
    );
    res.json({ success: true, data: order });
  } catch (e) {
    next(e);
  }
});

export default router;
