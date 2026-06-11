import type { OrderStatus } from "@rabbit/database";
import { prisma } from "../lib/prisma";
import { getRedis } from "../lib/redis";
import { getIO, orderRoom, riderRoom, storeRoom } from "../socket/io";
import { REDIS_KEYS } from "@rabbit/shared";
import { badRequest, forbidden, notFound } from "../lib/errors";
import type { DeliveryOfferPayload, RiderDeliveryStage } from "../types/delivery";
import { ORDER_STATUS_LABELS } from "../lib/order-labels";

const OFFER_TTL_SECONDS = 30;

export async function emitDeliveryOffers(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shop: { select: { name: true, latitude: true, longitude: true } },
    },
  });

  if (!order || order.deliveryPartnerId) return;
  if (!["PREPARING", "OUT_FOR_DELIVERY"].includes(order.status)) return;

  const onlineRiders = await prisma.rabbitorProfile.findMany({
    where: { isAvailable: true },
    select: { userId: true },
  });

  if (onlineRiders.length === 0) return;

  const payload: DeliveryOfferPayload = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    storeName: order.shop.name,
    storeLat: order.shop.latitude,
    storeLng: order.shop.longitude,
    destLat: order.destLatitude,
    destLng: order.destLongitude,
    payoutInr: Math.round(order.deliveryFee + order.riderTip),
    expiresInSeconds: OFFER_TTL_SECONDS,
    requiresAccept: true,
  };

  const io = getIO();
  for (const rider of onlineRiders) {
    io.to(riderRoom(rider.userId)).emit("DELIVERY_OFFERED", payload);
  }
}

export async function acceptDeliveryOffer(riderId: string, orderId: string) {
  const profile = await prisma.rabbitorProfile.findUnique({ where: { userId: riderId } });
  if (!profile?.isAvailable) {
    throw forbidden("Go online to accept delivery offers");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order not found");
  if (order.deliveryPartnerId && order.deliveryPartnerId !== riderId) {
    throw badRequest("Offer already taken", "OFFER_TAKEN");
  }
  if (!["PREPARING", "OUT_FOR_DELIVERY"].includes(order.status)) {
    throw badRequest("Order is no longer available");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id: orderId } });
    if (!current) throw notFound("Order not found");
    if (current.deliveryPartnerId && current.deliveryPartnerId !== riderId) {
      throw badRequest("Offer already taken", "OFFER_TAKEN");
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        deliveryPartnerId: riderId,
        deliveryMethod: "RABBITOR",
        status: current.status === "PREPARING" ? "OUT_FOR_DELIVERY" : current.status,
      },
      include: {
        shop: { select: { id: true, name: true, latitude: true, longitude: true, address: true } },
      },
    });
  });

  await getRedis().set(
    REDIS_KEYS.riderStage(orderId),
    "ASSIGNED",
    "EX",
    86400,
  );

  const io = getIO();
  io.to(orderRoom(orderId)).emit("status-updated", ORDER_STATUS_LABELS.OUT_FOR_DELIVERY);
  io.to(orderRoom(orderId)).emit("ORDER_STATUS_UPDATED", {
    orderId: updated.id,
    status: ORDER_STATUS_LABELS.OUT_FOR_DELIVERY,
  });
  io.to(storeRoom(updated.shopId)).emit("ORDER_STATUS_UPDATED", {
    orderId: updated.id,
    status: updated.status,
  });

  return {
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    riderStage: "ASSIGNED" as RiderDeliveryStage,
    shopName: updated.shop.name,
    shopAddress: updated.shop.address,
    shopLat: updated.shop.latitude,
    shopLng: updated.shop.longitude,
    destLat: updated.destLatitude,
    destLng: updated.destLongitude,
    deliveryAddress: updated.deliveryAddress,
    payoutInr: Math.round(updated.deliveryFee + updated.riderTip),
  };
}

export async function updateRiderDeliveryStage(
  riderId: string,
  orderId: string,
  stage: RiderDeliveryStage,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, deliveryPartnerId: riderId },
    include: { shop: { select: { id: true, name: true } } },
  });
  if (!order) throw notFound("Active delivery not found");

  const currentStage =
    ((await getRedis().get(REDIS_KEYS.riderStage(orderId))) as RiderDeliveryStage | null) ??
    "ASSIGNED";

  const transitions: Record<RiderDeliveryStage, RiderDeliveryStage[]> = {
    ASSIGNED: ["ARRIVED_AT_STORE"],
    ARRIVED_AT_STORE: ["PICKED_UP"],
    PICKED_UP: ["DELIVERED"],
    DELIVERED: [],
  };

  if (!transitions[currentStage]?.includes(stage)) {
    throw badRequest(`Cannot move from ${currentStage} to ${stage}`);
  }

  await getRedis().set(REDIS_KEYS.riderStage(orderId), stage, "EX", 86400);

  const io = getIO();
  let orderStatus: OrderStatus | null = null;

  if (stage === "PICKED_UP" && order.status !== "OUT_FOR_DELIVERY") {
    orderStatus = "OUT_FOR_DELIVERY";
  } else if (stage === "DELIVERED") {
    orderStatus = "DELIVERED";
  }

  if (orderStatus) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: orderStatus,
        ...(orderStatus === "DELIVERED" ? { deliveredAt: new Date() } : {}),
      },
    });
    await getRedis().set(REDIS_KEYS.orderStatus(orderId), orderStatus, "EX", 86400);
    const statusLabel = ORDER_STATUS_LABELS[orderStatus];
    io.to(orderRoom(orderId)).emit("status-updated", statusLabel);
    io.to(orderRoom(orderId)).emit("ORDER_STATUS_UPDATED", {
      orderId,
      status: statusLabel,
    });
    io.to(storeRoom(order.shopId)).emit("ORDER_STATUS_UPDATED", {
      orderId,
      status: orderStatus,
    });
  } else {
    io.to(orderRoom(orderId)).emit("rider-stage-updated", { orderId, stage });
    io.to(storeRoom(order.shopId)).emit("RIDER_STAGE_UPDATED", { orderId, stage });
  }

  if (stage === "DELIVERED") {
    await prisma.rabbitorProfile.update({
      where: { userId: riderId },
      data: { isAvailable: true },
    });
    await getRedis().del(REDIS_KEYS.riderStage(orderId));
    await getRedis().del(REDIS_KEYS.orderRiderLocation(orderId));
  }

  return { orderId, stage, status: orderStatus ?? order.status };
}

export async function getActiveRiderDelivery(riderId: string) {
  const order = await prisma.order.findFirst({
    where: {
      deliveryPartnerId: riderId,
      status: { in: ["PREPARING", "OUT_FOR_DELIVERY"] },
    },
    include: {
      shop: { select: { name: true, address: true, latitude: true, longitude: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!order) return null;

  const riderStage =
    ((await getRedis().get(REDIS_KEYS.riderStage(order.id))) as RiderDeliveryStage | null) ??
    "ASSIGNED";

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    riderStage,
    shopName: order.shop.name,
    shopAddress: order.shop.address,
    shopLat: order.shop.latitude,
    shopLng: order.shop.longitude,
    destLat: order.destLatitude,
    destLng: order.destLongitude,
    deliveryAddress: order.deliveryAddress,
    payoutInr: Math.round(order.deliveryFee + order.riderTip),
  };
}

export async function persistRiderLocation(
  orderId: string,
  riderId: string,
  lat: number,
  lng: number,
) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      deliveryPartnerId: riderId,
      status: { in: ["ACCEPTED_BY_SHOP", "PREPARING", "OUT_FOR_DELIVERY"] },
    },
    select: { id: true },
  });
  if (!order) return;

  const prevRaw = await getRedis().get(REDIS_KEYS.orderRiderLocation(orderId));
  let bearing: number | undefined;
  if (prevRaw) {
    try {
      const prev = JSON.parse(prevRaw) as { lat?: number; lng?: number };
      if (typeof prev.lat === "number" && typeof prev.lng === "number") {
        bearing = bearingDegrees(prev.lat, prev.lng, lat, lng);
      }
    } catch {
      /* ignore corrupt cache */
    }
  }

  const payload = JSON.stringify({ lat, lng, bearing, updatedAt: Date.now() });

  await Promise.all([
    getRedis().set(REDIS_KEYS.orderRiderLocation(orderId), payload, "EX", 3600),
    getRedis().set(REDIS_KEYS.riderLocation(riderId), payload, "EX", 3600),
    prisma.rabbitorProfile.update({
      where: { userId: riderId },
      data: { currentLat: lat, currentLng: lng },
    }),
  ]);

  getIO().to(orderRoom(orderId)).emit("location-updated", { lat, lng, bearing });
}

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
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
