import type { UserEventType, Prisma } from "@rabbit/database";
import { prisma } from "../lib/prisma";

export async function recordUserEvent(input: {
  userId?: string | null;
  eventType: UserEventType;
  metadata?: Prisma.InputJsonValue;
  sessionId?: string;
  ipAddress?: string;
}) {
  return prisma.userEvent.create({
    data: {
      userId: input.userId ?? null,
      eventType: input.eventType,
      metadata: input.metadata ?? undefined,
      sessionId: input.sessionId,
      ipAddress: input.ipAddress,
    },
  });
}

export async function upsertCartSnapshot(userId: string, items: unknown) {
  return prisma.cartSnapshot.upsert({
    where: { userId },
    create: { userId, items: items as object },
    update: { items: items as object },
  });
}

export async function getFunnelAnalytics(from: Date, to: Date) {
  const where = { createdAt: { gte: from, lte: to } };

  const [loggedIn, cartCreated, checkoutStarted, orderPlaced, paymentCompleted, paymentFailed] =
    await Promise.all([
      prisma.userEvent.count({ where: { ...where, eventType: "LOGIN" } }),
      prisma.userEvent.count({
        where: { ...where, eventType: { in: ["CART_ADD", "CART_VIEW"] } },
      }),
      prisma.userEvent.count({ where: { ...where, eventType: "CHECKOUT_START" } }),
      prisma.userEvent.count({ where: { ...where, eventType: "ORDER_PLACED" } }),
      prisma.order.count({
        where: { createdAt: { gte: from, lte: to }, paymentStatus: "PAID" },
      }),
      prisma.userEvent.count({ where: { ...where, eventType: "PAYMENT_FAILED" } }),
    ]);

  const cartSnapshots = await prisma.cartSnapshot.count({
    where: { updatedAt: { gte: from, lte: to } },
  });

  return {
    loggedIn,
    cartCreated: Math.max(cartCreated, cartSnapshots),
    checkoutStarted,
    orderPlaced,
    paymentCompleted,
    paymentFailed,
  };
}

export async function getCustomerJourney(userId: string) {
  const [events, cart, orders, statusHistory] = await Promise.all([
    prisma.userEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    prisma.cartSnapshot.findUnique({ where: { userId } }),
    prisma.order.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalPrice: true,
        createdAt: true,
      },
    }),
    prisma.orderStatusEvent.findMany({
      where: { order: { customerId: userId } },
      orderBy: { createdAt: "asc" },
      take: 500,
      select: {
        orderId: true,
        status: true,
        note: true,
        createdAt: true,
      },
    }),
  ]);

  return { events, cart, orders, statusHistory };
}
