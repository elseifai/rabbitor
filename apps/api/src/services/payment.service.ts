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

export async function assertCustomerOwnsOrder(orderId: string, customerId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order not found");
  if (order.customerId !== customerId) throw forbidden("Order does not belong to this customer");
  return order;
}
