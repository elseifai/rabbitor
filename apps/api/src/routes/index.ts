import { Router } from "express";
import authRoutes, { otpRouter } from "./auth.routes";
import storesRoutes from "./stores.routes";
import productsRoutes from "./products.routes";
import productsUploadRoutes, {
  couponsRouter,
  vendorRouter,
  adminRouter,
} from "./platform.routes";
import ordersRoutes from "./orders.routes";
import paymentsRoutes from "./payments.routes";
import rabbitorRoutes from "./rabbitor.routes";
import merchantRoutes from "./merchant.routes";
import internalRoutes from "./internal.routes";
import adsRoutes from "./ads.routes";
import analyticsRoutes from "./analytics.routes";
import { prisma } from "../lib/prisma";
import { getRedis } from "../lib/redis";

const router = Router();

router.get("/health", async (_req, res) => {
  let db: "connected" | "error" = "error";
  let redis: "connected" | "error" = "error";

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "connected";
  } catch {
    db = "error";
  }

  try {
    const pong = await getRedis().ping();
    redis = pong === "PONG" ? "connected" : "error";
  } catch {
    redis = "error";
  }

  res.json({
    success: true,
    data: {
      status: db === "connected" ? "ok" : "degraded",
      db,
      redis,
      uptime: process.uptime(),
      service: "rabbit-api",
      version: "0.1.0",
    },
  });
});

router.use("/auth/otp", otpRouter);
router.use("/otp", otpRouter);
router.use("/auth", authRoutes);
router.use("/stores", storesRoutes);
router.use("/stores/:storeId/products", productsRoutes);
router.use("/products", productsUploadRoutes);
router.use("/coupons", couponsRouter);
router.use("/vendor", vendorRouter);
router.use("/admin", adminRouter);
router.use("/rabbitor", rabbitorRoutes);
router.use("/merchant", merchantRoutes);
router.use("/orders", ordersRoutes);
router.use("/payments", paymentsRoutes);
router.use("/ads", adsRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/internal", internalRoutes);

export default router;
