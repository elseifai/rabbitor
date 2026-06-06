import { prisma } from "../lib/prisma";
import { notFound, forbidden } from "../lib/errors";

async function assertVendorOwnsStore(vendorUserId: string, storeId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
  if (!vendor) throw forbidden();
  const store = await prisma.store.findFirst({ where: { id: storeId, vendorId: vendor.id } });
  if (!store) throw notFound("Store not found");
  return store;
}

export async function listProductsByStore(storeId: string, availableOnly = true) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw notFound("Store not found");

  return prisma.product.findMany({
    where: {
      storeId,
      ...(availableOnly && { isAvailable: true }),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      storeId: true,
      name: true,
      description: true,
      price: true,
      unit: true,
      images: true,
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
      storeId,
      name: data.name,
      description: data.description,
      price: data.price,
      unit: data.unit,
      images: data.images ?? [],
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
    where: { id: productId, store: { vendorId: vendor.id } },
  });
  if (!product) throw notFound("Product not found");

  return prisma.product.update({
    where: { id: productId },
    data: { isAvailable },
  });
}
