import { prisma } from "../lib/prisma";
import { forbidden, notFound } from "../lib/errors";

async function getRabbitorProfile(userId: string) {
  const profile = await prisma.rabbitorProfile.findUnique({ where: { userId } });
  if (!profile) throw forbidden("Rabbitor profile not found");
  return profile;
}

export async function setRabbitorAvailability(userId: string, isAvailable: boolean) {
  await getRabbitorProfile(userId);
  return prisma.rabbitorProfile.update({
    where: { userId },
    data: { isAvailable },
  });
}

export async function listRabbitorJobs(userId: string) {
  await getRabbitorProfile(userId);
  const orders = await prisma.order.findMany({
    where: {
      deliveryPartnerId: userId,
      status: { in: ["ACCEPTED_BY_SHOP", "PREPARING", "OUT_FOR_DELIVERY"] },
    },
    include: {
      shop: { select: { name: true, latitude: true, longitude: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    shopName: o.shop.name,
    deliveryAddress: o.deliveryAddress,
    totalPrice: o.totalPrice,
    deliveryFee: o.deliveryFee,
    riderTip: o.riderTip,
    destLatitude: o.destLatitude,
    destLongitude: o.destLongitude,
    createdAt: o.createdAt.toISOString(),
  }));
}

export async function getRabbitorEarnings(userId: string) {
  await getRabbitorProfile(userId);
  const orders = await prisma.order.findMany({
    where: { deliveryPartnerId: userId, status: "DELIVERED" },
    select: {
      id: true,
      orderNumber: true,
      deliveryFee: true,
      riderTip: true,
      deliveredAt: true,
      totalPrice: true,
    },
    orderBy: { deliveredAt: "desc" },
    take: 50,
  });

  const totalEarnings = orders.reduce((sum, o) => sum + o.deliveryFee + o.riderTip, 0);

  return {
    totalEarnings,
    deliveredCount: orders.length,
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      amount: o.deliveryFee + o.riderTip,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
    })),
  };
}

export async function getRabbitorJob(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, deliveryPartnerId: userId },
    include: { shop: { select: { name: true } } },
  });
  if (!order) throw notFound("Job not found");
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    shopName: order.shop.name,
    deliveryAddress: order.deliveryAddress,
    totalPrice: order.totalPrice,
    destLatitude: order.destLatitude,
    destLongitude: order.destLongitude,
  };
}
