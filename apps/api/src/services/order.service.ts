import type { DeliveryMethod } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { notFound, badRequest, forbidden } from "../lib/errors";
import { getRedis } from "../lib/redis";
import { REDIS_KEYS } from "@rabbit/shared";

export async function createOrder(
  customerId: string,
  input: {
    storeId: string;
    items: { productId: string; quantity: number }[];
    deliveryMethod: DeliveryMethod;
    deliveryAddress: string;
  }
) {
  const store = await prisma.store.findUnique({
    where: { id: input.storeId },
    include: { products: { where: { id: { in: input.items.map((i) => i.productId) } } } },
  });
  if (!store) throw notFound("Store not found");
  if (!store.isOpen) throw badRequest("Store is currently closed", "STORE_CLOSED");

  let subtotal = 0;
  const lineItems: { productId: string; quantity: number; unitPrice: number }[] = [];

  for (const item of input.items) {
    const product = store.products.find((p) => p.id === item.productId);
    if (!product || !product.isAvailable) {
      throw badRequest(`Product unavailable: ${item.productId}`, "PRODUCT_UNAVAILABLE");
    }
    if (product.stock < item.quantity) {
      throw badRequest(`Insufficient stock for ${product.name}`, "INSUFFICIENT_STOCK");
    }
    subtotal += product.price * item.quantity;
    lineItems.push({ productId: product.id, quantity: item.quantity, unitPrice: product.price });
  }

  if (subtotal < store.minOrderValue) {
    throw badRequest(
      `Minimum order value is ₹${store.minOrderValue}`,
      "MIN_ORDER_NOT_MET"
    );
  }

  const totalAmount = subtotal + store.deliveryFee;
  const deliveryAddressEnc = Buffer.from(input.deliveryAddress).toString("base64");

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        customerId,
        storeId: store.id,
        deliveryMethod: input.deliveryMethod,
        totalAmount,
        deliveryFee: store.deliveryFee,
        deliveryAddressEnc,
        items: { create: lineItems },
      },
      include: { items: true, store: { select: { name: true } } },
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
    totalAmount: order.totalAmount,
    storeId: order.storeId,
    storeName: order.store.name,
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
    include: { store: { include: { vendor: true } } },
  });
  if (!order) throw notFound("Order not found");

  const isVendor = order.store.vendor.userId === actorUserId;
  const isCustomer = order.customerId === actorUserId;
  const isRabbitor = order.rabbitorId === actorUserId;

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
      status,
      ...(status === "DELIVERED" && { deliveredAt: new Date() }),
    },
  });

  await getRedis().set(REDIS_KEYS.orderStatus(orderId), status, "EX", 86400);
  return updated;
}

export async function getOrderForUser(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      OR: [
        { customerId: userId },
        { store: { vendor: { userId } } },
        { rabbitorId: userId },
      ],
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      store: { select: { name: true } },
    },
  });
  if (!order) throw notFound("Order not found");

  // Address revealed only after delivery confirmed (privacy rule)
  const showAddress = order.status === "DELIVERED";
  return {
    id: order.id,
    status: order.status,
    deliveryMethod: order.deliveryMethod,
    totalAmount: order.totalAmount,
    deliveryFee: order.deliveryFee,
    storeName: order.store.name,
    items: order.items.map((i) => ({
      productName: i.product.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
    ...(showAddress && {
      deliveryAddress: Buffer.from(order.deliveryAddressEnc, "base64").toString("utf8"),
    }),
    createdAt: order.createdAt.toISOString(),
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
  };
}
