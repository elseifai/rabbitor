import { prisma } from "../lib/prisma";
import { notFound, forbidden } from "../lib/errors";
import {
  getCachedShopProducts,
  invalidateShopProductCaches,
  normalizeProductCategory,
  PRODUCT_CACHE_ALL_CATEGORY,
  setCachedShopProducts,
  shopCategoryCacheKey,
} from "../lib/inventory-cache";

const PRODUCT_SELECT = {
  id: true,
  shopId: true,
  name: true,
  description: true,
  price: true,
  mrp: true,
  unit: true,
  image: true,
  isAvailable: true,
  stock: true,
  category: true,
} as const;

export type ShopProductDto = {
  id: string;
  shopId: string;
  name: string;
  description: string | null;
  price: number;
  mrp: number | null;
  unit: string;
  image: string | null;
  isAvailable: boolean;
  stock: number;
  category: string;
};

async function assertVendorOwnsStore(vendorUserId: string, storeId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
  if (!vendor) throw forbidden();
  const shop = await prisma.shop.findFirst({ where: { id: storeId, vendorId: vendor.id } });
  if (!shop) throw notFound("Store not found");
  return shop;
}

async function loadProductsFromDatabase(
  storeId: string,
  options: { availableOnly: boolean; category: string },
): Promise<ShopProductDto[]> {
  const shop = await prisma.shop.findUnique({ where: { id: storeId } });
  if (!shop) throw notFound("Store not found");

  return prisma.product.findMany({
    where: {
      shopId: storeId,
      ...(options.availableOnly && { isAvailable: true }),
      ...(options.category !== PRODUCT_CACHE_ALL_CATEGORY && {
        category: options.category,
      }),
    },
    orderBy: { name: "asc" },
    select: PRODUCT_SELECT,
  });
}

/**
 * Cache-aside read for shop inventory feeds (optionally filtered by menu category).
 */
export async function listProductsByStore(
  storeId: string,
  options: {
    availableOnly?: boolean;
    category?: string | null;
  } = {},
): Promise<ShopProductDto[]> {
  const availableOnly = options.availableOnly !== false;
  const category = normalizeProductCategory(options.category);
  const cacheKey = shopCategoryCacheKey(storeId, category);

  const cached = await getCachedShopProducts<ShopProductDto[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const products = await loadProductsFromDatabase(storeId, { availableOnly, category });
  await setCachedShopProducts(cacheKey, products);
  return products;
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
    category?: string;
  },
) {
  await assertVendorOwnsStore(vendorUserId, storeId);

  const category = normalizeProductCategory(data.category);
  const product = await prisma.product.create({
    data: {
      shopId: storeId,
      name: data.name,
      description: data.description,
      price: data.price,
      unit: data.unit,
      image: data.images?.[0],
      stock: data.stock ?? 0,
      category: category === PRODUCT_CACHE_ALL_CATEGORY ? "general" : category,
    },
    select: PRODUCT_SELECT,
  });

  await invalidateShopProductCaches(storeId, [product.category, PRODUCT_CACHE_ALL_CATEGORY]);
  return product;
}

export async function updateProduct(
  vendorUserId: string,
  productId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    unit?: string;
    image?: string | null;
    stock?: number;
    category?: string;
    isAvailable?: boolean;
  },
) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
  if (!vendor) throw forbidden();

  const existing = await prisma.product.findFirst({
    where: { id: productId, shop: { vendorId: vendor.id } },
    select: { id: true, shopId: true, category: true },
  });
  if (!existing) throw notFound("Product not found");

  const nextCategory =
    data.category !== undefined
      ? normalizeProductCategory(data.category) === PRODUCT_CACHE_ALL_CATEGORY
        ? "general"
        : normalizeProductCategory(data.category)
      : undefined;

  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.image !== undefined && { image: data.image }),
      ...(data.stock !== undefined && { stock: data.stock }),
      ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      ...(nextCategory !== undefined && { category: nextCategory }),
    },
    select: PRODUCT_SELECT,
  });

  await invalidateShopProductCaches(existing.shopId, [
    existing.category,
    product.category,
    PRODUCT_CACHE_ALL_CATEGORY,
  ]);

  return product;
}

export async function deleteProduct(vendorUserId: string, productId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
  if (!vendor) throw forbidden();

  const existing = await prisma.product.findFirst({
    where: { id: productId, shop: { vendorId: vendor.id } },
    select: { id: true, shopId: true, category: true },
  });
  if (!existing) throw notFound("Product not found");

  await prisma.product.delete({ where: { id: productId } });
  await invalidateShopProductCaches(existing.shopId, [existing.category, PRODUCT_CACHE_ALL_CATEGORY]);

  return { id: existing.id, deleted: true };
}

export async function toggleProductAvailability(
  vendorUserId: string,
  productId: string,
  isAvailable: boolean,
) {
  return updateProduct(vendorUserId, productId, { isAvailable });
}
