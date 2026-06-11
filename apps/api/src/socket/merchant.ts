import type { Socket } from "socket.io";
import { prisma } from "../lib/prisma";
import type { JwtPayload } from "../middleware/auth";
import { storeRoom } from "./io";

interface JoinStoreRoomPayload {
  storeId: string;
}

export function registerMerchantHandlers(socket: Socket): void {
  socket.on("join-store-room", async ({ storeId }: JoinStoreRoomPayload) => {
    if (!storeId) {
      socket.emit("store-join-error", { message: "storeId is required" });
      return;
    }

    const user = socket.data.user as JwtPayload | undefined;
    if (!user) {
      socket.emit("store-join-error", { message: "Unauthorized" });
      return;
    }

    if (user.role !== "VENDOR" && user.role !== "ADMIN") {
      socket.emit("store-join-error", { message: "Merchant access only" });
      return;
    }

    const shop = await prisma.shop.findFirst({
      where: {
        id: storeId,
        OR: [{ ownerId: user.sub }, { vendor: { userId: user.sub } }],
      },
      select: { id: true, name: true },
    });

    if (!shop) {
      socket.emit("store-join-error", { message: "Store not found or access denied" });
      return;
    }

    await socket.join(storeRoom(storeId));
    socket.data.storeId = storeId;
    socket.emit("store-joined", { storeId, storeName: shop.name });
  });

  socket.on("leave-store-room", ({ storeId }: JoinStoreRoomPayload) => {
    if (!storeId) return;
    socket.leave(storeRoom(storeId));
  });
}
