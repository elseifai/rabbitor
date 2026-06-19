import crypto from "crypto";
import Razorpay from "razorpay";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { badRequest, forbidden, notFound } from "../lib/errors";

function getRazorpayClient(): Razorpay {
  if (!config.razorpayKeyId || !config.razorpayKeySecret) {
    throw badRequest("Razorpay is not configured", "PAYMENT_NOT_CONFIGURED");
  }
  return new Razorpay({
    key_id: config.razorpayKeyId,
    key_secret: config.razorpayKeySecret,
  });
}

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!config.razorpayWebhookSecret) return false;
  const expected = crypto
    .createHmac("sha256", config.razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

export async function createRazorpayOrder(orderId: string, amount: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order not found");
  if (order.paymentStatus === "PAID") {
    throw badRequest("Order is already paid", "ORDER_ALREADY_PAID");
  }

  const amountPaise = Math.round(amount * 100);
  const razorpay = getRazorpayClient();

  const razorpayOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: order.orderNumber,
    notes: { orderId: order.id },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      razorpayOrderId: razorpayOrder.id,
      paymentStatus: "PENDING",
    },
  });

  return {
    razorpayOrderId: razorpayOrder.id,
    amount: amountPaise,
    currency: "INR" as const,
    key: config.razorpayKeyId,
  };
}

export async function verifyPayment(
  customerId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  if (!config.razorpayKeySecret) {
    throw badRequest("Razorpay is not configured", "PAYMENT_NOT_CONFIGURED");
  }

  const expectedSignature = crypto
    .createHmac("sha256", config.razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    await prisma.order.updateMany({
      where: { razorpayOrderId, customerId },
      data: { paymentStatus: "FAILED" },
    });
    throw badRequest("Invalid payment signature", "INVALID_SIGNATURE");
  }

  const order = await prisma.order.findFirst({
    where: { razorpayOrderId, customerId },
  });
  if (!order) throw notFound("Order not found");
  if (order.paymentStatus === "PAID") {
    return order;
  }

  return prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      razorpayPaymentId,
    },
  });
}

export async function handleRazorpayWebhook(rawBody: string, signature: string) {
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw badRequest("Invalid webhook signature", "INVALID_WEBHOOK_SIGNATURE");
  }

  const payload = JSON.parse(rawBody) as {
    event?: string;
    payload?: {
      payment?: { entity?: { order_id?: string; id?: string; status?: string } };
      refund?: { entity?: { payment_id?: string } };
    };
  };

  const event = payload.event ?? "";
  const paymentEntity = payload.payload?.payment?.entity;

  if (event === "payment.failed" && paymentEntity?.order_id) {
    await prisma.order.updateMany({
      where: { razorpayOrderId: paymentEntity.order_id },
      data: { paymentStatus: "FAILED" },
    });
    return { handled: true, event };
  }

  if (event === "payment.captured" && paymentEntity?.order_id && paymentEntity.id) {
    await prisma.order.updateMany({
      where: { razorpayOrderId: paymentEntity.order_id, paymentStatus: { not: "PAID" } },
      data: {
        paymentStatus: "PAID",
        razorpayPaymentId: paymentEntity.id,
      },
    });
    return { handled: true, event };
  }

  if (event === "refund.processed" && payload.payload?.refund?.entity?.payment_id) {
    const paymentId = payload.payload.refund.entity.payment_id;
    await prisma.order.updateMany({
      where: { razorpayPaymentId: paymentId },
      data: { paymentStatus: "REFUNDED" },
    });
    return { handled: true, event };
  }

  return { handled: false, event };
}

export async function assertCustomerOwnsOrder(orderId: string, customerId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order not found");
  if (order.customerId !== customerId) throw forbidden("Order does not belong to this customer");
  return order;
}
