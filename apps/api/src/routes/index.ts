import { Router } from "express";
import authRoutes from "./auth.routes";
import storesRoutes from "./stores.routes";
import productsRoutes from "./products.routes";
import ordersRoutes from "./orders.routes";
import internalRoutes from "./internal.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      service: "rabbit-api",
      version: "0.1.0",
      phase: 2,
      features: ["rest-api", "live-order-tracking"],
    },
  });
});

router.use("/auth", authRoutes);
router.use("/stores", storesRoutes);
router.use("/stores/:storeId/products", productsRoutes);
router.use("/orders", ordersRoutes);
router.use("/internal", internalRoutes);

export default router;
