import { prisma } from "../lib/prisma";
import { notFound, forbidden } from "../lib/errors";

async function assertVendorOwnsStore(vendorUserId: string, storeId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
  if (!vendor) throw forbidden();
  const shop = await prisma.shop.findFirst({ where: { id: storeId, vendorId: vendor.id } });
  if (!shop) throw notFound("Store not found");
  return shop;
}

export async function listProductsByStore(storeId: string, availableOnly = true) {
  const shop = await prisma.shop.findUnique({ where: { id: storeId } });
  if (!shop) throw notFound("Store not found");

  return prisma.product.findMany({
    where: {
      shopId: storeId,
      ...(availableOnly && { isAvailable: true }),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      shopId: true,
      name: true,
      description: true,
      price: true,
      unit: true,
      image: true,
      isAvailable: true,
    },
  });
}

export async function createProduct(
  vendorUserId: string,
  storeId: string,
  data: {
    name: string;
    description?: string;
    price: number;
    unit?: string;
    images?: string[];
    stock?: number;
  }
) {
  await assertVendorOwnsStore(vendorUserId, storeId);
  return prisma.product.create({
    data: {
      shopId: storeId,
      name: data.name,
      description: data.description,
      price: data.price,
      unit: data.unit,
      image: data.images?.[0],
      stock: data.stock ?? 0,
    },
  });
}

export async function toggleProductAvailability(
  vendorUserId: string,
  productId: string,
  isAvailable: boolean
) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
  if (!vendor) throw forbidden();

  const product = await prisma.product.findFirst({
    where: { id: productId, shop: { vendorId: vendor.id } },
  });
  if (!product) throw notFound("Product not found");

  return prisma.product.update({
    where: { id: productId },
    data: { isAvailable },
  });
}
