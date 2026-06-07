import jwt from "jsonwebtoken";
import type { Server, Socket } from "socket.io";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import type { JwtPayload } from "../middleware/auth";
import { orderRoom, setIO } from "./io";

interface JoinOrderRoomPayload {
  orderId: string;
}

interface UpdateLiveLocationPayload {
  orderId: string;
  lat: number;
  lng: number;
}

export function setupTrackingSocket(io: Server): void {
  setIO(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Unauthorized"));
    }
    try {
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    socket.on("join-order-room", ({ orderId }: JoinOrderRoomPayload) => {
      if (!orderId) return;
      socket.join(orderRoom(orderId));
    });

    socket.on("leave-order-room", ({ orderId }: JoinOrderRoomPayload) => {
      if (!orderId) return;
      socket.leave(orderRoom(orderId));
    });

    socket.on("update-live-location", async ({ orderId, lat, lng }: UpdateLiveLocationPayload) => {
      if (!orderId || typeof lat !== "number" || typeof lng !== "number") return;

      const user = socket.data.user as JwtPayload | undefined;
      if (!user) return;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { deliveryPartnerId: true },
      });

      if (!order || order.deliveryPartnerId !== user.sub) return;

      io.to(orderRoom(orderId)).emit("location-updated", { lat, lng });
    });
  });
}
