import type { Socket } from "socket.io";
import type { JwtPayload } from "../middleware/auth";
import { riderRoom } from "./io";
import { persistRiderLocation } from "../services/delivery-offer.service";

interface RiderLocationPayload {
  orderId: string;
  lat: number;
  lng: number;
}

export function registerRiderHandlers(socket: Socket): void {
  socket.on("join-rider-room", () => {
    const user = socket.data.user as JwtPayload | undefined;
    if (!user || user.role !== "RABBITOR") {
      socket.emit("rider-join-error", { message: "Rabbitor access only" });
      return;
    }

    void socket.join(riderRoom(user.sub));
    socket.data.riderId = user.sub;
    socket.emit("rider-joined", { riderId: user.sub });
  });

  socket.on("leave-rider-room", () => {
    const user = socket.data.user as JwtPayload | undefined;
    if (!user) return;
    socket.leave(riderRoom(user.sub));
  });

  socket.on("RIDER_LOCATION_UPDATE", async ({ orderId, lat, lng }: RiderLocationPayload) => {
    if (!orderId || typeof lat !== "number" || typeof lng !== "number") return;

    const user = socket.data.user as JwtPayload | undefined;
    if (!user || user.role !== "RABBITOR") return;

    try {
      await persistRiderLocation(orderId, user.sub, lat, lng);
    } catch {
      // Ignore stale location updates
    }
  });
}
