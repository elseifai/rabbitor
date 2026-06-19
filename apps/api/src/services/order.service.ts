import type { DeliveryMethod, OrderStatus, Prisma } from "@rabbit/database";
import { prisma } from "../lib/prisma";
import { notFound, badRequest, forbidden } from "../lib/errors";
import { getRedis } from "../lib/redis";
import { haversineKm } from "../lib/geo";
import { encryptAddress, decryptAddress } from "../lib/crypto";
import { emitNewOrderToStore } from "./merchant-order-events";
import { getIO, orderRoom, riderRoom } from "../socket/io";
import { ORDER_STATUS_LABELS } from "../lib/order-labels";
import { REDIS_KEYS } from "@rabbit/shared";
import { invalidateAllShopProductCaches } from "../lib/inventory-cache";
import { sendPushNotification } from "../lib/fcm";
import { applyCouponInTransaction } from "./coupon.service";
import { recordUserEvent } from "./analytics.service";

function generateOrderNumber(): string {
  return `RBT-${Date.now().toString(36).toUpperCase()}`;
}

const STATUS_MAP: Record<string, OrderStatus> = {
  ACCEPTED: "ACCEPTED_BY_SHOP",
  REJECTED: "CANCELLED",
  PREPARING: "PREPARING",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

async function cacheOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  try {
    await getRedis().set(REDIS_KEYS.orderStatus(orderId), status, "EX", 86400);
  } catch (err) {
    console.warn("[redis] order status cache failed:", (err as Error).message);
  }
}

async function recordOrderStatusEvent(
  tx: Prisma.TransactionClient,
  orderId: string,
  status: OrderStatus,
  note?: string,
): Promise<void> {
  await tx.orderStatusEvent.create({
    data: { orderId, status, note },
  });
}

export async function createOrder(
  customerId: string,
  input: {
    storeId: string;
    items: { productId: string; quantity: number }[];
    deliveryMethod: DeliveryMethod;
    deliveryAddress: string;
    couponCode?: string;
  }
) {
  const shop = await prisma.shop.findUnique({ where: { id: input.storeId } });
  if (!shop) throw notFound("Store not found");
  if (!shop.isActive) throw badRequest("Store is currently closed", "STORE_CLOSED");

  const deliveryAddressEnc = encryptAddress(input.deliveryAddress);

  const order = await prisma.$transaction(async (tx) => {
    let subtotal = 0;
    const lineItems: { productId: string; quantity: number; price: number }[] = [];

    for (const item of input.items) {
      const product = await tx.product.findFirst({
        where: {
          id: item.productId,
          shopId: shop.id,
          isAvailable: true,
        },
      });
      if (!product) {
        throw badRequest(`Product unavailable: ${item.productId}`, "PRODUCT_UNAVAILABLE");
      }

      const reserved = await tx.product.updateMany({
        where: {
          id: product.id,
          stock: { gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });
      if (reserved.count !== 1) {
        throw badRequest(`Insufficient stock for ${product.name}`, "INSUFFICIENT_STOCK");
      }

      subtotal += product.price * item.quantity;
      lineItems.push({ productId: product.id, quantity: item.quantity, price: product.price });
    }

    if (subtotal < shop.minOrderValue) {
      throw badRequest(
        `Minimum order value is ₹${shop.minOrderValue}`,
        "MIN_ORDER_NOT_MET"
      );
    }

    let appliedCouponCode: string | undefined;
    let discountAmount = 0;
    let orderSubtotal = subtotal;

    if (input.couponCode) {
      const couponResult = await applyCouponInTransaction(tx, input.couponCode, subtotal);
      appliedCouponCode = couponResult.appliedCouponCode;
      discountAmount = couponResult.discountAmount;
      orderSubtotal = Math.max(0, subtotal - discountAmount);
    }

    const orderTotal = orderSubtotal + shop.baseDeliveryFee;

    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        shopId: shop.id,
        deliveryMethod: input.deliveryMethod,
        totalPrice: orderTotal,
        deliveryFee: shop.baseDeliveryFee,
        deliveryAddress: input.deliveryAddress,
        deliveryAddressEnc,
        appliedCouponCode,
        discountAmount,
        items: { create: lineItems },
      },
      include: { items: true, shop: { select: { name: true } } },
    });

    await recordOrderStatusEvent(tx, created.id, created.status, "Order created");

    return created;
  });

  await cacheOrderStatus(order.id, order.status);
  await invalidateAllShopProductCaches(shop.id);

  try {
    await emitNewOrderToStore(order.id);
  } catch (err) {
    console.warn("[merchant-order-events] emit failed:", (err as Error).message);
  }

  void recordUserEvent({
    userId: customerId,
    eventType: "ORDER_PLACED",
    metadata: { orderId: order.id, shopId: shop.id },
  });

  return {
    id: order.id,
    status: order.status,
    deliveryMethod: order.deliveryMethod,
    totalAmount: order.totalPrice,
    storeId: order.shopId,
    storeName: order.shop.name,
    createdAt: order.createdAt.toISOString(),
  };
}

type VendorStatusInput = "ACCEPTED" | "REJECTED" | "PREPARING" | "OUT_FOR_DELIVERY" | "CANCELLED";

export async function listMerchantOrders(shopId: string, page = 1, limit = 50) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const where = { shopId };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: { product: { select: { name: true, unit: true } } },
        },
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalPrice: o.totalPrice,
      deliveryFee: o.deliveryFee,
      itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
      items: o.items.map((item) => ({
        id: item.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        unit: item.product.unit,
      })),
      customerPhone: o.customer.phone ?? "",
      createdAt: o.createdAt.toISOString(),
    })),
    page: safePage,
    limit: safeLimit,
    total,
  };
}

export async function updateMerchantOrderStatus(
  shopId: string,
  orderId: string,
  status: VendorStatusInput,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, shopId },
    include: {
      shop: {
        select: {
          latitude: true,
          longitude: true,
        },
      },
      customer: { select: { fcmToken: true } },
    },
  });

  if (!order) {
    throw notFound("Order not found");
  }

  if (!["ACCEPTED", "REJECTED", "PREPARING", "OUT_FOR_DELIVERY", "CANCELLED"].includes(status)) {
    throw forbidden("Merchants cannot set this order status");
  }

  const mappedStatus = STATUS_MAP[status];

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.order.update({
      where: { id: order.id },
      data: { status: mappedStatus },
    });
    await recordOrderStatusEvent(tx, order.id, mappedStatus, `Merchant set ${status}`);
    return row;
  });

  await cacheOrderStatus(orderId, mappedStatus);

  if (mappedStatus === "OUT_FOR_DELIVERY") {
    await assignNearestRabbitorForOrder(orderId);
  }

  await notifyCustomerOrderStatus(order.customer.fcmToken, mappedStatus);

  return updated;
}

export async function updateOrderStatus(
  actorUserId: string,
  actorRole: string,
  orderId: string,
  status: "ACCEPTED" | "REJECTED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED"
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shop: {
        select: {
          ownerId: true,
          latitude: true,
          longitude: true,
          vendor: true,
        },
      },
      customer: { select: { fcmToken: true } },
    },
  });
  if (!order) throw notFound("Order not found");

  const mappedStatus = STATUS_MAP[status];
  const isVendor =
    order.shop.vendor?.userId === actorUserId || order.shop.ownerId === actorUserId;
  const isCustomer = order.customerId === actorUserId;
  const isRabbitor = order.deliveryPartnerId === actorUserId;

  if (status === "ACCEPTED" || status === "REJECTED" || status === "PREPARING") {
    if (!isVendor) throw forbidden("Only vendor can update to this status");
  } else if (status === "OUT_FOR_DELIVERY") {
    if (!isVendor && !isRabbitor) throw forbidden();
  } else if (status === "DELIVERED") {
    if (!isVendor && !isRabbitor) throw forbidden();
  } else if (status === "CANCELLED") {
    if (!isCustomer && !isVendor) throw forbidden();
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.order.update({
      where: { id: orderId },
      data: {
        status: mappedStatus,
        ...(status === "DELIVERED" && { deliveredAt: new Date() }),
      },
    });
    await recordOrderStatusEvent(tx, orderId, mappedStatus, `Actor ${actorRole}`);
    return row;
  });

  await cacheOrderStatus(orderId, mappedStatus);

  if (mappedStatus === "OUT_FOR_DELIVERY") {
    await assignNearestRabbitorForOrder(orderId);
  }

  await notifyCustomerOrderStatus(order.customer.fcmToken, mappedStatus);

  return updated;
}

const STATUS_PUSH: Partial<Record<OrderStatus, { title: string; body: string }>> = {
  ACCEPTED_BY_SHOP: {
    title: "Order Accepted! 🎉",
    body: "Your order is being prepared.",
  },
  OUT_FOR_DELIVERY: {
    title: "Out for Delivery 🐰",
    body: "Your Rabbitor is on the way!",
  },
  DELIVERED: {
    title: "Delivered! ✅",
    body: "Enjoy your order. Rate your experience.",
  },
  CANCELLED: {
    title: "Order Cancelled",
    body: "Your order was cancelled.",
  },
};

async function notifyCustomerOrderStatus(
  fcmToken: string | null | undefined,
  status: OrderStatus
) {
  if (!fcmToken) return;
  const message = STATUS_PUSH[status];
  if (!message) return;
  await sendPushNotification(fcmToken, message.title, message.body);
}

const RABBITOR_SEARCH_RADIUS_KM = 10;

export type RiderAssignResult = {
  assigned: boolean;
  riderId?: string;
  displayName?: string;
};

/** Assign nearest online rider once the order is packed and ready for pickup. */
export async function assignNearestRabbitorForOrder(orderId: string): Promise<RiderAssignResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shop: { select: { latitude: true, longitude: true, name: true } },
    },
  });

  if (!order || order.deliveryPartnerId) {
    return { assigned: Boolean(order?.deliveryPartnerId), riderId: order?.deliveryPartnerId ?? undefined };
  }

  const shopLat = order.shop.latitude;
  const shopLng = order.shop.longitude;
  const latDelta = RABBITOR_SEARCH_RADIUS_KM / 111;
  const lngDelta =
    RABBITOR_SEARCH_RADIUS_KM / (111 * Math.max(0.1, Math.cos((shopLat * Math.PI) / 180)));

  const rabbitors = await prisma.rabbitorProfile.findMany({
    where: {
      isAvailable: true,
      currentLat: {
        not: null,
        gte: shopLat - latDelta,
        lte: shopLat + latDelta,
      },
      currentLng: {
        not: null,
        gte: shopLng - lngDelta,
        lte: shopLng + lngDelta,
      },
    },
    include: {
      user: { select: { id: true, displayName: true, name: true } },
    },
  });

  let nearest: (typeof rabbitors)[number] | null = null;
  let nearestDist = Infinity;

  for (const rabbitor of rabbitors) {
    const dist = haversineKm(shopLat, shopLng, rabbitor.currentLat!, rabbitor.currentLng!);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = rabbitor;
    }
  }

  const io = getIO();
  const room = orderRoom(orderId);

  if (nearest && nearestDist <= RABBITOR_SEARCH_RADIUS_KM) {
    const displayName = nearest.user.displayName ?? nearest.user.name ?? "Rabbitor";

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          deliveryPartnerId: nearest.user.id,
          deliveryMethod: "RABBITOR",
        },
      }),
      prisma.rabbitorProfile.update({
        where: { id: nearest.id },
        data: { isAvailable: false },
      }),
    ]);

    await getRedis().set(REDIS_KEYS.riderStage(orderId), "ASSIGNED", "EX", 86400);

    io.to(room).emit("rabbitor-assigned", { displayName });
    io.to(room).emit("ORDER_STATUS_UPDATED", {
      orderId,
      status: ORDER_STATUS_LABELS.OUT_FOR_DELIVERY,
    });
    io.to(riderRoom(nearest.user.id)).emit("DELIVERY_ASSIGNED", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      storeName: order.shop.name,
      storeLat: shopLat,
      storeLng: shopLng,
      destLat: order.destLatitude,
      destLng: order.destLongitude,
      payoutInr: Math.round(order.deliveryFee + order.riderTip),
    });

    return { assigned: true, riderId: nearest.user.id, displayName };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { deliveryMethod: "SELF" },
  });

  io.to(room).emit("no-rabbitor-available", {});
  return { assigned: false };
}

/** Cancel unpaid API orders after timeout and restore stock. */
export async function expireStalePendingPaymentOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const stale = await prisma.order.findMany({
    where: {
      paymentStatus: "PENDING",
      status: "PENDING",
      createdAt: { lt: cutoff },
    },
    include: { items: true, customer: { select: { fcmToken: true } } },
  });

  let count = 0;
  for (const order of stale) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", paymentStatus: "FAILED" },
      });
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await recordOrderStatusEvent(
        tx,
        order.id,
        "CANCELLED",
        "Payment timeout — order auto-cancelled",
      );
    });

    await cacheOrderStatus(order.id, "CANCELLED");

    if (order.customer.fcmToken) {
      await sendPushNotification(
        order.customer.fcmToken,
        "Complete your order",
        "You left something behind — tap to finish checkout.",
      ).catch(() => undefined);
    }

    count += 1;
  }

  return count;
}

export async function listCustomerOrders(
  customerId: string,
  page = 1,
  limit = 20
) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { customerId },
      include: { shop: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit,
    }),
    prisma.order.count({ where: { customerId } }),
  ]);

  return {
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      storeName: o.shop.name,
      status: o.status,
      totalPrice: o.totalPrice,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
    })),
    page: safePage,
    limit: safeLimit,
    total,
  };
}

export async function getOrderForUser(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      OR: [
        { customerId: userId },
        { shop: { vendor: { userId } } },
        { shop: { ownerId: userId } },
        { deliveryPartnerId: userId },
      ],
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      shop: { select: { name: true } },
    },
  });
  if (!order) throw notFound("Order not found");

  const showAddress = order.status === "DELIVERED";
  return {
    id: order.id,
    status: order.status,
    deliveryMethod: order.deliveryMethod,
    totalAmount: order.totalPrice,
    deliveryFee: order.deliveryFee,
    storeName: order.shop.name,
    items: order.items.map((i) => ({
      productName: i.product.name,
      quantity: i.quantity,
      unitPrice: i.price,
    })),
    ...(showAddress && {
      deliveryAddress: order.deliveryAddressEnc
        ? decryptAddress(order.deliveryAddressEnc)
        : order.deliveryAddress,
    }),
    createdAt: order.createdAt.toISOString(),
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
  };
}
