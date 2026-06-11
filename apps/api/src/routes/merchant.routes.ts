import { Router } from "express";
import { z } from "zod";
import * as orderService from "../services/order.service";
import {
  authenticate,
  requireMerchantAccess,
  type AuthRequest,
  type MerchantAuthRequest,
} from "../middleware/auth";

const router = Router();

router.get(
  "/orders",
  authenticate,
  requireMerchantAccess,
  async (req: AuthRequest, res, next) => {
    try {
      const merchantReq = req as MerchantAuthRequest;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const result = await orderService.listMerchantOrders(merchantReq.merchantStoreId, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/orders/:id/status",
  authenticate,
  requireMerchantAccess,
  async (req: AuthRequest, res, next) => {
    try {
      const merchantReq = req as MerchantAuthRequest;
      const schema = z.object({
        status: z.enum([
          "ACCEPTED",
          "REJECTED",
          "PREPARING",
          "OUT_FOR_DELIVERY",
          "CANCELLED",
        ]),
      });
      const { status } = schema.parse(req.body);
      const order = await orderService.updateMerchantOrderStatus(
        merchantReq.merchantStoreId,
        String(req.params.id),
        status,
      );
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
