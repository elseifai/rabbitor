import type { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma";
import { ACTIVE_RIDER_ORDER_STATUSES, type JwtPayload } from "../middleware/auth";
import { orderRoom, setIO } from "./io";
import { socketAuthMiddleware } from "./auth";
import { registerMerchantHandlers } from "./merchant";
import { registerRiderHandlers } from "./rider";

interface JoinOrderRoomPayload {
  orderId: string;
}

interface UpdateLiveLocationPayload {
  orderId: string;
  lat: number;
  lng: number;
  bearing?: number;
}

export function setupTrackingSocket(io: Server): void {
  setIO(io);
  io.use(socketAuthMiddleware);

  io.on("connection", (socket: Socket) => {
    registerMerchantHandlers(socket);
    registerRiderHandlers(socket);

    socket.on("join-order-room", ({ orderId }: JoinOrderRoomPayload) => {
      if (!orderId) return;
      socket.join(orderRoom(orderId));
    });

    socket.on("leave-order-room", ({ orderId }: JoinOrderRoomPayload) => {
      if (!orderId) return;
      socket.leave(orderRoom(orderId));
    });

    socket.on("update-live-location", async ({ orderId, lat, lng, bearing }: UpdateLiveLocationPayload) => {
      if (!orderId || typeof lat !== "number" || typeof lng !== "number") return;

      const user = socket.data.user as JwtPayload | undefined;
      if (!user) return;

      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          deliveryPartnerId: user.sub,
          status: { in: ACTIVE_RIDER_ORDER_STATUSES },
        },
        select: { id: true },
      });

      if (!order) return;

      io.to(orderRoom(orderId)).emit("location-updated", { lat, lng, bearing });
    });
  });
}
