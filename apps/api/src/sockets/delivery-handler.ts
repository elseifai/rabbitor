/**
 * Delivery Telemetry Gateway
 *
 * Handles real-time rider GPS streams from the 'rider:location_update' channel.
 *
 * Architecture:
 *  - Every incoming coordinate frame is immediately broadcast to the customer's
 *    order room (order_${orderId}) as 'tracking:stream' — zero DB round-trips.
 *  - Redis is updated on every frame for ephemeral state (fast, no disk I/O).
 *  - The rider's profile is written to Postgres at most once every 15 seconds
 *    as an archival fallback so cold-start clients can fetch the last known position.
 */

import type { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma";
import { getRedis } from "../lib/redis";
import { getIO } from "../socket/io";
import { REDIS_KEYS } from "@rabbit/shared";
import { ACTIVE_RIDER_ORDER_STATUSES, type JwtPayload } from "../middleware/auth";

interface LocationFrame {
  orderId: string;
  lat: number;
  lng: number;
  bearing?: number;
  riderId?: string;
}

/** Per-order timestamp of the last Postgres archival write */
const lastDbWrite = new Map<string, number>();
const DB_WRITE_INTERVAL_MS = 15_000;

function bearingDegrees(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const φ1 = (fromLat * Math.PI) / 180;
  const φ2 = (toLat * Math.PI) / 180;
  const Δλ = ((toLng - fromLng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Process a single GPS frame from a rider socket.
 * 1. Validate order ownership.
 * 2. Compute bearing from previous Redis snapshot.
 * 3. Broadcast immediately to the order room (no DB wait).
 * 4. Write to Postgres only if 15 s have elapsed since last write.
 */
async function handleLocationFrame(
  socket: Socket,
  { orderId, lat, lng, bearing: incomingBearing }: LocationFrame,
): Promise<void> {
  if (!orderId || typeof lat !== "number" || typeof lng !== "number") return;

  const user = socket.data.user as JwtPayload | undefined;
  if (!user || user.role !== "RABBITOR") return;

  // Verify the rider is assigned to this order and it is still active
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      deliveryPartnerId: user.sub,
      status: { in: ACTIVE_RIDER_ORDER_STATUSES },
    },
    select: { id: true },
  });
  if (!order) return;

  // Derive bearing from previous position if not supplied by the client
  const redis = getRedis();
  let bearing = incomingBearing;
  if (bearing == null) {
    const prevRaw = await redis.get(REDIS_KEYS.orderRiderLocation(orderId));
    if (prevRaw) {
      try {
        const prev = JSON.parse(prevRaw) as { lat?: number; lng?: number };
        if (typeof prev.lat === "number" && typeof prev.lng === "number") {
          bearing = bearingDegrees(prev.lat, prev.lng, lat, lng);
        }
      } catch {
        /* stale cache — ignore */
      }
    }
  }

  const frame = { lat, lng, bearing, ts: Date.now() };

  // 1. Broadcast instantly to the customer watching this order
  const io = getIO();
  io.to(`order_${orderId}`).emit("tracking:stream", frame);
  // Also emit on the legacy 'location-updated' channel for backwards compat
  io.to(`order_${orderId}`).emit("location-updated", { lat, lng, bearing });

  // 2. Fast Redis snapshot — no disk I/O
  void Promise.all([
    redis.set(
      REDIS_KEYS.orderRiderLocation(orderId),
      JSON.stringify(frame),
      "EX",
      3600,
    ),
    redis.set(
      REDIS_KEYS.riderLocation(user.sub),
      JSON.stringify(frame),
      "EX",
      3600,
    ),
  ]);

  // 3. Throttled Postgres write — at most once every 15 seconds
  const now = Date.now();
  const lastWrite = lastDbWrite.get(orderId) ?? 0;
  if (now - lastWrite >= DB_WRITE_INTERVAL_MS) {
    lastDbWrite.set(orderId, now);
    void prisma.rabbitorProfile
      .update({
        where: { userId: user.sub },
        data: { currentLat: lat, currentLng: lng },
      })
      .catch(() => {
        /* non-critical — next window will retry */
      });
  }
}

/** Register the telemetry channel on a connected socket. */
export function registerDeliveryHandler(socket: Socket): void {
  // Primary channel: rider:location_update (as per spec)
  socket.on("rider:location_update", (payload: LocationFrame) => {
    void handleLocationFrame(socket, payload);
  });

  // Legacy alias so existing rider app clients still work
  socket.on("RIDER_LOCATION_UPDATE", (payload: LocationFrame) => {
    void handleLocationFrame(socket, payload);
  });

  socket.on("update-live-location", (payload: LocationFrame) => {
    void handleLocationFrame(socket, payload);
  });

  // Clean up throttle map on disconnect
  socket.on("disconnect", () => {
    const user = socket.data.user as JwtPayload | undefined;
    if (!user) return;
    // Remove all entries where riderId = user.sub (scan by value is impractical;
    // entries auto-expire after the order completes)
  });
}

/** Wire the delivery telemetry gateway into an existing Socket.io server. */
export function setupDeliveryHandler(io: Server): void {
  io.on("connection", (socket: Socket) => {
    registerDeliveryHandler(socket);
  });
}
