import type { StoreType } from "@rabbit/database";
import { prisma } from "../lib/prisma";
import { distanceKm, boundingBox } from "../lib/geo";
import { notFound, forbidden } from "../lib/errors";

/** Public store shape — never includes address or vendor KYC */
function toPublicStore(
  shop: {
    id: string;
    name: string;
    storeType: StoreType;
    latitude: number;
    longitude: number;
    isActive: boolean;
    minOrderValue: number;
    baseDeliveryFee: number;
    deliveryRadiusKm: number;
    vendor: { subscriptionTier: string } | null;
  },
  customerLat?: number,
  customerLng?: number
) {
  const base = {
    id: shop.id,
    name: shop.name,
    storeType: shop.storeType,
    latitude: shop.latitude,
    longitude: shop.longitude,
    isOpen: shop.isActive,
    minOrderValue: shop.minOrderValue,
    deliveryFee: shop.baseDeliveryFee,
    deliveryRadiusKm: shop.deliveryRadiusKm,
    subscriptionTier: shop.vendor?.subscriptionTier ?? "FREE",
  };
  if (customerLat != null && customerLng != null) {
    return {
      ...base,
      distanceKm: Math.round(distanceKm(customerLat, customerLng, shop.latitude, shop.longitude) * 100) / 100,
    };
  }
  return base;
}

export async function findNearbyStores(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  storeType?: StoreType;
  openOnly?: boolean;
}) {
  const searchRadius = params.radiusKm ?? 5;
  const box = boundingBox(params.lat, params.lng, searchRadius);

  const shops = await prisma.shop.findMany({
    where: {
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLng, lte: box.maxLng },
      ...(params.openOnly && { isActive: true }),
      ...(params.storeType && { storeType: params.storeType }),
    },
    include: { vendor: { select: { subscriptionTier: true } } },
  });

  return shops
    .map((shop) => {
      const dist = distanceKm(params.lat, params.lng, shop.latitude, shop.longitude);
      return { shop, dist };
    })
    .filter(({ shop, dist }) => dist <= Math.min(searchRadius, shop.deliveryRadiusKm))
    .sort((a, b) => a.dist - b.dist)
    .map(({ shop, dist }) => ({
      ...toPublicStore(shop, params.lat, params.lng),
      distanceKm: Math.round(dist * 100) / 100,
    }));
}

export async function getStoreById(storeId: string, lat?: number, lng?: number) {
  const shop = await prisma.shop.findUnique({
    where: { id: storeId },
    include: { vendor: { select: { subscriptionTier: true } } },
  });
  if (!shop) throw notFound("Store not found");
  return toPublicStore(shop, lat, lng);
}

export async function createStore(
  vendorUserId: string,
  data: {
    name: string;
    storeType: StoreType;
    latitude: number;
    longitude: number;
    address: string;
    description?: string;
    deliveryRadiusKm?: number;
    minOrderValue?: number;
    deliveryFee?: number;
    preferredDelivery?: "SELF" | "RABBITOR" | "THIRD_PARTY";
    openingHours?: Record<string, { open: string; close: string }>;
  }
) {
  let vendor = await prisma.vendorProfile.findUnique({
    where: { userId: vendorUserId },
  });
  if (!vendor) {
    vendor = await prisma.vendorProfile.create({
      data: {
        userId: vendorUserId,
        businessName: data.name,
      },
    });
  }

  // Phase 1: placeholder encryption — replace with AES-256-GCM in production
  const addressEncrypted = Buffer.from(data.address).toString("base64");
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return prisma.shop.create({
    data: {
      ownerId: vendorUserId,
      vendorId: vendor.id,
      name: data.name,
      slug: `${slug}-${Date.now().toString(36)}`,
      category: data.description?.trim() || data.storeType,
      storeType: data.storeType,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      addressEncrypted,
      deliveryRadiusKm: data.deliveryRadiusKm ?? 3,
      minOrderValue: data.minOrderValue ?? 0,
      baseDeliveryFee: data.deliveryFee ?? 0,
      preferredDelivery: data.preferredDelivery ?? "SELF",
      openingHours: data.openingHours ?? undefined,
    },
    include: { vendor: { select: { subscriptionTier: true } } },
  }).then((shop) => toPublicStore(shop));
}

export async function setStoreOpen(vendorUserId: string, storeId: string, isOpen: boolean) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
  if (!vendor) throw forbidden();

  const shop = await prisma.shop.findFirst({
    where: { id: storeId, vendorId: vendor.id },
  });
  if (!shop) throw notFound("Store not found");

  const updated = await prisma.shop.update({
    where: { id: storeId },
    data: { isActive: isOpen },
    include: { vendor: { select: { subscriptionTier: true } } },
  });
  return toPublicStore(updated);
}
