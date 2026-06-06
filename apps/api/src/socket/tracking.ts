import type { Server, Socket } from "socket.io";
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

  io.on("connection", (socket: Socket) => {
    socket.on("join-order-room", ({ orderId }: JoinOrderRoomPayload) => {
      if (!orderId) return;
      socket.join(orderRoom(orderId));
    });

    socket.on("leave-order-room", ({ orderId }: JoinOrderRoomPayload) => {
      if (!orderId) return;
      socket.leave(orderRoom(orderId));
    });

    socket.on("update-live-location", ({ orderId, lat, lng }: UpdateLiveLocationPayload) => {
      if (!orderId || typeof lat !== "number" || typeof lng !== "number") return;
      io.to(orderRoom(orderId)).emit("location-updated", { lat, lng });
    });
  });
}
