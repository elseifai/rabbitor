import { Router } from "express";
import { z } from "zod";
import * as paymentService from "../services/payment.service";
import { authenticate, requireRoles, type AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/create", authenticate, requireRoles("CUSTOMER"), async (req: AuthRequest, res, next) => {
  try {
    const { orderId } = z.object({ orderId: z.string().uuid() }).parse(req.body);
    const order = await paymentService.assertCustomerOwnsOrder(orderId, req.user!.sub);
    const amount = order.totalPrice + order.deliveryFee + order.riderTip;
    const result = await paymentService.createRazorpayOrder(orderId, amount);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post("/verify", authenticate, requireRoles("CUSTOMER"), async (req: AuthRequest, res, next) => {
  try {
    const body = z
      .object({
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
      })
      .parse(req.body);

    const order = await paymentService.verifyPayment(
      req.user!.sub,
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature
    );

    res.json({
      success: true,
      data: {
        orderId: order.id,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
