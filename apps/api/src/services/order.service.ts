import type { DeliveryMethod, OrderStatus } from "@rabbit/database";
import { prisma } from "../lib/prisma";
import { notFound, badRequest, forbidden } from "../lib/errors";
import { getRedis } from "../lib/redis";
import { haversineKm } from "../lib/geo";
import { getIO, orderRoom } from "../socket/io";
import { REDIS_KEYS } from "@rabbit/shared";
import { sendPushNotification } from "../lib/fcm";
import { applyCouponInTransaction } from "./coupon.service";

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
  const shop = await prisma.shop.findUnique({
    where: { id: input.storeId },
    include: { products: { where: { id: { in: input.items.map((i) => i.productId) } } } },
  });
  if (!shop) throw notFound("Store not found");
  if (!shop.isActive) throw badRequest("Store is currently closed", "STORE_CLOSED");

  let subtotal = 0;
  const lineItems: { productId: string; quantity: number; price: number }[] = [];

  for (const item of input.items) {
    const product = shop.products.find((p) => p.id === item.productId);
    if (!product || !product.isAvailable) {
      throw badRequest(`Product unavailable: ${item.productId}`, "PRODUCT_UNAVAILABLE");
    }
    if (product.stock < item.quantity) {
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

  const totalPrice = subtotal + shop.baseDeliveryFee;
  const deliveryAddressEnc = Buffer.from(input.deliveryAddress).toString("base64");

  const order = await prisma.$transaction(async (tx) => {
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

    for (const item of lineItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }
    return created;
  });

  await getRedis().set(REDIS_KEYS.orderStatus(order.id), order.status, "EX", 86400);

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

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: mappedStatus,
      ...(status === "DELIVERED" && { deliveredAt: new Date() }),
    },
  });

  await getRedis().set(REDIS_KEYS.orderStatus(orderId), mappedStatus, "EX", 86400);

  if (mappedStatus === "ACCEPTED_BY_SHOP") {
    await assignNearestRabbitor(orderId, order.shop.latitude, order.shop.longitude);
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

async function assignNearestRabbitor(orderId: string, shopLat: number, shopLng: number) {
  const rabbitors = await prisma.rabbitorProfile.findMany({
    where: {
      isAvailable: true,
      currentLat: { not: null },
      currentLng: { not: null },
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
    const displayName = nearest.user.displayName ?? nearest.user.name;

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

    io.to(room).emit("rabbitor-assigned", { displayName });
    return;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { deliveryMethod: "SELF" },
  });

  io.to(room).emit("no-rabbitor-available", {});
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

  // Address revealed only after delivery confirmed (privacy rule)
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
    ...(showAddress && order.deliveryAddressEnc && {
      deliveryAddress: Buffer.from(order.deliveryAddressEnc, "base64").toString("utf8"),
    }),
    createdAt: order.createdAt.toISOString(),
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
  };
}
