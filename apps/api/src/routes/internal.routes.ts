import { Router } from "express";
import { emitDeliveryOffers } from "../services/delivery-offer.service";
import { emitNewOrderToStore } from "../services/merchant-order-events";
import { getIO, orderRoom } from "../socket/io";
import { ORDER_STATUS_LABELS } from "../lib/order-labels";

const router = Router();

router.post("/order-events", (req, res) => {
  const { orderId, type, status, lat, lng } = req.body as {
    orderId?: string;
    type?: "status" | "location";
    status?: string;
    lat?: number;
    lng?: number;
  };

  if (!orderId || !type) {
    res.status(400).json({ success: false, error: "orderId and type are required" });
    return;
  }

  try {
    const io = getIO();
    const room = orderRoom(orderId);

    if (type === "status" && status) {
      const label = ORDER_STATUS_LABELS[status] ?? status;
      io.to(room).emit("status-updated", label);
      io.to(room).emit("ORDER_STATUS_UPDATED", { orderId, status: label });
    } else if (type === "location" && typeof lat === "number" && typeof lng === "number") {
      io.to(room).emit("location-updated", { lat, lng });
    } else {
      res.status(400).json({ success: false, error: "Invalid event payload" });
      return;
    }

    res.json({ success: true });
  } catch {
    res.status(503).json({ success: false, error: "Realtime server unavailable" });
  }
});

router.post("/delivery/offer", async (req, res) => {
  const { orderId } = req.body as { orderId?: string };

  if (!orderId) {
    res.status(400).json({ success: false, error: "orderId is required" });
    return;
  }

  try {
    await emitDeliveryOffers(orderId);
    res.json({ success: true });
  } catch {
    res.status(503).json({ success: false, error: "Realtime server unavailable" });
  }
});

router.post("/merchant/new-order", async (req, res) => {
  const { orderId } = req.body as { orderId?: string };

  if (!orderId) {
    res.status(400).json({ success: false, error: "orderId is required" });
    return;
  }

  try {
    await emitNewOrderToStore(orderId);
    res.json({ success: true });
  } catch {
    res.status(503).json({ success: false, error: "Realtime server unavailable" });
  }
});

export default router;
