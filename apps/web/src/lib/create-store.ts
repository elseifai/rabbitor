import type { StoreType } from '@rabbit/database'
import { prisma } from '@/lib/prisma'

export type CreateStoreInput = {
  name: string
  storeType: StoreType
  category?: string
  latitude: number
  longitude: number
  address: string
  description?: string
  deliveryRadiusKm?: number
  minOrderValue?: number
  deliveryFee?: number
  openingHours?: Record<string, { open: string; close: string }>
}

export async function createMerchantStore(vendorUserId: string, data: CreateStoreInput) {
  let vendor = await prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } })
  if (!vendor) {
    vendor = await prisma.vendorProfile.create({
      data: {
        userId: vendorUserId,
        businessName: data.name,
      },
    })
  }

  const addressEncrypted = Buffer.from(data.address).toString('base64')
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)

  return prisma.shop.create({
    data: {
      ownerId: vendorUserId,
      vendorId: vendor.id,
      name: data.name,
      slug: `${slug}-${Date.now().toString(36)}`,
      category: data.category?.trim() || data.description?.trim() || data.storeType,
      storeType: data.storeType,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      addressEncrypted,
      deliveryRadiusKm: data.deliveryRadiusKm ?? 5,
      minOrderValue: data.minOrderValue ?? 0,
      baseDeliveryFee: data.deliveryFee ?? 0,
      openingHours: data.openingHours ?? undefined,
    },
  })
}
