import { prisma } from "../lib/prisma";
import { getIO, storeRoom } from "../socket/io";
import type { MerchantNewOrderPayload } from "../types/merchant-order";

const ACK_DEADLINE_SECONDS = 90;

export async function emitNewOrderToStore(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { name: true } } } },
      shop: { select: { id: true, name: true } },
      customer: { select: { phone: true } },
    },
  });

  if (!order) return;

  const payload: MerchantNewOrderPayload = {
    id: order.id,
    orderNumber: order.orderNumber,
    storeId: order.shopId,
    storeName: order.shop.name,
    status: order.status,
    totalPrice: order.totalPrice,
    deliveryFee: order.deliveryFee,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    items: order.items.map((item) => ({
      id: item.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.price,
    })),
    customerPhone: order.customer.phone?.replace(/\d(?=\d{4})/g, "•") ?? "",
    createdAt: order.createdAt.toISOString(),
    requiresAck: true,
    ackDeadlineSeconds: ACK_DEADLINE_SECONDS,
  };

  getIO().to(storeRoom(order.shopId)).emit("NEW_ORDER", payload);
}
