import type { StoreType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { distanceKm, boundingBox } from "../lib/geo";
import { notFound, forbidden } from "../lib/errors";

/** Public store shape — never includes address or vendor KYC */
function toPublicStore(
  store: {
    id: string;
    name: string;
    storeType: StoreType;
    latitude: number;
    longitude: number;
    isOpen: boolean;
    minOrderValue: number;
    deliveryFee: number;
    deliveryRadiusKm: number;
    vendor: { subscriptionTier: string };
  },
  customerLat?: number,
  customerLng?: number
) {
  const base = {
    id: store.id,
    name: store.name,
    storeType: store.storeType,
    latitude: store.latitude,
    longitude: store.longitude,
    isOpen: store.isOpen,
    minOrderValue: store.minOrderValue,
    deliveryFee: store.deliveryFee,
    deliveryRadiusKm: store.deliveryRadiusKm,
    subscriptionTier: store.vendor.subscriptionTier,
  };
  if (customerLat != null && customerLng != null) {
    return {
      ...base,
      distanceKm: Math.round(distanceKm(customerLat, customerLng, store.latitude, store.longitude) * 100) / 100,
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

  const stores = await prisma.store.findMany({
    where: {
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLng, lte: box.maxLng },
      ...(params.openOnly && { isOpen: true }),
      ...(params.storeType && { storeType: params.storeType }),
    },
    include: { vendor: { select: { subscriptionTier: true } } },
  });

  return stores
    .map((s) => {
      const dist = distanceKm(params.lat, params.lng, s.latitude, s.longitude);
      return { store: s, dist };
    })
    .filter(({ store, dist }) => dist <= Math.min(searchRadius, store.deliveryRadiusKm))
    .sort((a, b) => a.dist - b.dist)
    .map(({ store, dist }) => ({
      ...toPublicStore(store, params.lat, params.lng),
      distanceKm: Math.round(dist * 100) / 100,
    }));
}

export async function getStoreById(storeId: string, lat?: number, lng?: number) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { vendor: { select: { subscriptionTier: true } } },
  });
  if (!store) throw notFound("Store not found");
  return toPublicStore(store, lat, lng);
}

export async function createStore(
  vendorUserId: string,
  data: {
    name: string;
    storeType: StoreType;
    latitude: number;
    longitude: number;
    address: string;
    deliveryRadiusKm?: number;
    minOrderValue?: number;
    deliveryFee?: number;
    preferredDelivery?: "SELF" | "RABBITOR" | "THIRD_PARTY";
  }
) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: vendorUserId },
  });
  if (!vendor) throw forbidden("Vendor profile required");

  // Phase 1: placeholder encryption — replace with AES-256-GCM in production
  const addressEncrypted = Buffer.from(data.address).toString("base64");

  return prisma.store.create({
    data: {
      vendorId: vendor.id,
      name: data.name,
      storeType: data.storeType,
      latitude: data.latitude,
      longitude: data.longitude,
      addressEncrypted,
      deliveryRadiusKm: data.deliveryRadiusKm ?? 3,
      minOrderValue: data.minOrderValue ?? 0,
      deliveryFee: data.deliveryFee ?? 0,
      preferredDelivery: data.preferredDelivery ?? "SELF",
    },
    include: { vendor: { select: { subscriptionTier: true } } },
  }).then((s) => toPublicStore(s));
}

export async function setStoreOpen(vendorUserId: string, storeId: string, isOpen: boolean) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
  if (!vendor) throw forbidden();

  const store = await prisma.store.findFirst({
    where: { id: storeId, vendorId: vendor.id },
  });
  if (!store) throw notFound("Store not found");

  const updated = await prisma.store.update({
    where: { id: storeId },
    data: { isOpen },
    include: { vendor: { select: { subscriptionTier: true } } },
  });
  return toPublicStore(updated);
}
