'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { mintApiAccessToken } from '@/lib/api-jwt'

export async function getMerchantShopAction() {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await prisma.shop.findFirst({
      where: { ownerId: session.userId },
      include: {
        products: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    })
    if (!shop) return null

    return {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      isActive: shop.isActive,
      address: shop.address,
      category: shop.category,
      minOrderValue: shop.minOrderValue,
      baseDeliveryFee: shop.baseDeliveryFee,
      avgPrepMinutes: shop.avgPrepMinutes,
      deliveryRadiusKm: shop.deliveryRadiusKm,
      products: shop.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        unit: p.unit,
        category: p.category,
        stock: p.stock,
        isAvailable: p.isAvailable,
        image: p.image,
      })),
    }
  } catch {
    return null
  }
}

export async function toggleShopOpenAction(shopId: string, isActive: boolean) {
  const session = await requireSession(['VENDOR', 'ADMIN'])
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.userId },
  })
  if (!shop) return { ok: false as const, error: 'Shop not found' }

  await prisma.shop.update({ where: { id: shopId }, data: { isActive } })
  revalidatePath('/merchant')
  revalidatePath('/merchant/products')
  revalidatePath('/shops')
  return { ok: true as const, isActive }
}

export async function addProductAction(input: {
  shopId: string
  name: string
  price: number
  category?: string
  unit?: string
  stock?: number
  imageDataUrl?: string
  imageUrl?: string
}) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await prisma.shop.findFirst({
      where: { id: input.shopId, ownerId: session.userId },
    })
    if (!shop) return { ok: false as const, error: 'Shop not found' }

    if (!input.name.trim()) {
      return { ok: false as const, error: 'Product name is required' }
    }
    if (!Number.isFinite(input.price) || input.price <= 0) {
      return { ok: false as const, error: 'Enter a valid price' }
    }

    let image: string | undefined
    if (input.imageUrl?.startsWith('http')) {
      image = input.imageUrl
    } else if (input.imageDataUrl?.startsWith('data:image/')) {
      if (input.imageDataUrl.length > 600_000) {
        return { ok: false as const, error: 'Image too large — use a smaller photo' }
      }
      image = input.imageDataUrl
    }

    const product = await prisma.product.create({
      data: {
        shopId: input.shopId,
        name: input.name.trim(),
        price: input.price,
        category: input.category?.trim() || 'general',
        unit: input.unit?.trim() || 'piece',
        stock: input.stock ?? 10,
        image,
        isAvailable: true,
      },
    })

    revalidatePath('/merchant')
    revalidatePath('/merchant/products')
    revalidatePath(`/shops/${shop.slug}`)
    return { ok: true as const, productId: product.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add product'
    return { ok: false as const, error: message }
  }
}

export async function toggleProductAvailabilityAction(
  productId: string,
  isAvailable: boolean,
) {
  const session = await requireSession(['VENDOR', 'ADMIN'])
  const product = await prisma.product.findFirst({
    where: { id: productId, shop: { ownerId: session.userId } },
    include: { shop: { select: { slug: true } } },
  })
  if (!product) return { ok: false as const, error: 'Product not found' }

  await prisma.product.update({ where: { id: productId }, data: { isAvailable } })
  revalidatePath('/merchant')
  revalidatePath('/merchant/products')
  revalidatePath('/shops')
  revalidatePath(`/shops/${product.shop.slug}`)
  return { ok: true as const }
}

export async function updateProductPriceAction(productId: string, price: number) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    if (!Number.isFinite(price) || price <= 0) {
      return { ok: false as const, error: 'Enter a valid price' }
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, shop: { ownerId: session.userId } },
      include: { shop: { select: { slug: true } } },
    })
    if (!product) return { ok: false as const, error: 'Product not found' }

    await prisma.product.update({ where: { id: productId }, data: { price } })
    revalidatePath('/merchant')
    revalidatePath('/merchant/products')
    revalidatePath(`/shops/${product.shop.slug}`)
    return { ok: true as const }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update price'
    return { ok: false as const, error: message }
  }
}

export async function getMerchantAnalyticsAction() {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await prisma.shop.findFirst({
      where: { ownerId: session.userId },
      select: { id: true, name: true },
    })
    if (!shop) return null

    const orders = await prisma.order.findMany({
      where: { shopId: shop.id },
      select: { status: true, totalPrice: true, deliveryFee: true, createdAt: true },
    })

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const delivered = orders.filter((o) => o.status === 'DELIVERED')
    const pending = orders.filter((o) =>
      ['PENDING', 'ACCEPTED_BY_SHOP', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(o.status),
    )
    const todayOrders = orders.filter((o) => o.createdAt >= startOfToday)
    const todayRevenue = todayOrders
      .filter((o) => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + o.totalPrice, 0)

    const [productCount, liveProductCount] = await Promise.all([
      prisma.product.count({ where: { shopId: shop.id } }),
      prisma.product.count({ where: { shopId: shop.id, isAvailable: true } }),
    ])

    return {
      shopName: shop.name,
      totalOrders: orders.length,
      deliveredOrders: delivered.length,
      pendingOrders: pending.length,
      totalRevenue: delivered.reduce((sum, o) => sum + o.totalPrice, 0),
      todayOrders: todayOrders.length,
      todayRevenue,
      productCount,
      liveProductCount,
    }
  } catch {
    return null
  }
}

export async function getMerchantSettingsAction() {
  const session = await requireSession(['VENDOR', 'ADMIN'])
  const shop = await prisma.shop.findFirst({
    where: { ownerId: session.userId },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      category: true,
      isActive: true,
      minOrderValue: true,
      baseDeliveryFee: true,
      avgPrepMinutes: true,
      deliveryRadiusKm: true,
      vendor: {
        select: {
          kycStatus: true,
          kycDocuments: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              docType: true,
              fileUrl: true,
              status: true,
              createdAt: true,
            },
          },
        },
      },
    },
  })
  if (!shop) return null

  return {
    ...shop,
    kycStatus: shop.vendor?.kycStatus ?? 'PENDING',
    kycDocuments: shop.vendor?.kycDocuments ?? [],
  }
}

export async function updateMerchantSettingsAction(input: {
  shopId: string
  minOrderValue: number
  baseDeliveryFee: number
  avgPrepMinutes: number
  deliveryRadiusKm: number
}) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await prisma.shop.findFirst({
      where: { id: input.shopId, ownerId: session.userId },
    })
    if (!shop) return { ok: false as const, error: 'Shop not found' }

    if (input.minOrderValue < 0 || input.baseDeliveryFee < 0) {
      return { ok: false as const, error: 'Values cannot be negative' }
    }
    if (input.avgPrepMinutes < 5 || input.avgPrepMinutes > 120) {
      return { ok: false as const, error: 'Prep time must be between 5 and 120 minutes' }
    }
    if (input.deliveryRadiusKm < 1 || input.deliveryRadiusKm > 15) {
      return { ok: false as const, error: 'Delivery radius must be between 1 and 15 km' }
    }

    await prisma.shop.update({
      where: { id: input.shopId },
      data: {
        minOrderValue: input.minOrderValue,
        baseDeliveryFee: input.baseDeliveryFee,
        avgPrepMinutes: Math.round(input.avgPrepMinutes),
        deliveryRadiusKm: input.deliveryRadiusKm,
      },
    })

    revalidatePath('/merchant')
    revalidatePath('/merchant/settings')
    revalidatePath('/shops')
    revalidatePath(`/shops/${shop.slug}`)
    return { ok: true as const }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save settings'
    return { ok: false as const, error: message }
  }
}

// MERCHANT DASHBOARD EXPANSION — comprehensive multi-step merchant onboarding
export async function merchantSignupAction(input: {
  legalStoreName: string
  businessCategory: string
  supportPhone: string
  address: string
  latitude: number
  longitude: number
  avgPrepMinutes: number
  openingHours: Record<string, { open: string; close: string }>
  bankAccountNumber: string
  ifscCode: string
  gstRef?: string
  panRef?: string
  fssaiRef?: string
  aadhaarRef?: string
  deliveryRadiusKm?: number
  minOrderValue?: number
  baseDeliveryFee?: number
}) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])

    const existing = await prisma.shop.findFirst({ where: { ownerId: session.userId } })
    if (existing) {
      return { ok: false as const, error: 'You already have a store registered' }
    }

    if (!input.legalStoreName.trim()) {
      return { ok: false as const, error: 'Legal store name is required' }
    }
    if (!input.supportPhone.trim() || input.supportPhone.replace(/\D/g, '').length < 10) {
      return { ok: false as const, error: 'Valid support contact is required' }
    }
    if (!input.address.trim()) {
      return { ok: false as const, error: 'Store address is required' }
    }
    if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
      return { ok: false as const, error: 'Valid geolocation is required' }
    }
    if (input.avgPrepMinutes < 5 || input.avgPrepMinutes > 120) {
      return { ok: false as const, error: 'Preparation time must be between 5 and 120 minutes' }
    }
    if (!input.bankAccountNumber.trim() || input.bankAccountNumber.length < 8) {
      return { ok: false as const, error: 'Valid bank account number is required' }
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(input.ifscCode.trim())) {
      return { ok: false as const, error: 'Enter a valid IFSC code' }
    }

    const categoryToStoreType = (cat: string) => {
      const lower = cat.toLowerCase()
      if (lower.includes('fish') || lower.includes('seafood')) return 'FISH' as const
      if (lower.includes('groc') || lower.includes('kirana')) return 'KIRANA' as const
      if (lower.includes('pharm')) return 'PHARMACY' as const
      if (lower.includes('baker')) return 'BAKERY' as const
      if (lower.includes('dairy')) return 'DAIRY' as const
      if (lower.includes('meat')) return 'MEAT' as const
      if (lower.includes('veget')) return 'VEGETABLE' as const
      return 'GENERAL' as const
    }

    const slugBase = input.legalStoreName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48)
    const slug = `${slugBase}-${Date.now().toString(36)}`
    const addressEncrypted = Buffer.from(input.address.trim()).toString('base64')

    const result = await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendorProfile.upsert({
        where: { userId: session.userId },
        create: {
          userId: session.userId,
          businessName: input.legalStoreName.trim(),
          businessCategory: input.businessCategory.trim(),
          supportPhone: input.supportPhone.trim(),
          kycStatus: 'PENDING',
          bankAccountRef: input.bankAccountNumber.trim(),
          ifscCode: input.ifscCode.trim().toUpperCase(),
          gstRef: input.gstRef?.trim() || null,
          panRef: input.panRef?.trim() || null,
          fssaiRef: input.fssaiRef?.trim() || null,
          aadhaarRef: input.aadhaarRef?.trim() || null,
        },
        update: {
          businessName: input.legalStoreName.trim(),
          businessCategory: input.businessCategory.trim(),
          supportPhone: input.supportPhone.trim(),
          bankAccountRef: input.bankAccountNumber.trim(),
          ifscCode: input.ifscCode.trim().toUpperCase(),
          gstRef: input.gstRef?.trim() || null,
          panRef: input.panRef?.trim() || null,
          fssaiRef: input.fssaiRef?.trim() || null,
          aadhaarRef: input.aadhaarRef?.trim() || null,
        },
      })

      const shop = await tx.shop.create({
        data: {
          ownerId: session.userId,
          vendorId: vendor.id,
          name: input.legalStoreName.trim(),
          slug,
          category: input.businessCategory.trim(),
          storeType: categoryToStoreType(input.businessCategory),
          address: input.address.trim(),
          addressEncrypted,
          latitude: input.latitude,
          longitude: input.longitude,
          avgPrepMinutes: Math.round(input.avgPrepMinutes),
          openingHours: input.openingHours,
          deliveryRadiusKm: input.deliveryRadiusKm ?? 5,
          minOrderValue: input.minOrderValue ?? 99,
          baseDeliveryFee: input.baseDeliveryFee ?? 25,
          isActive: true,
        },
      })

      return { shopId: shop.id, kycStatus: vendor.kycStatus }
    })

    revalidatePath('/merchant')
    revalidatePath('/merchant/signup')
    revalidatePath('/shops')
    return { ok: true as const, shopId: result.shopId, approvalStatus: 'PENDING_APPROVAL' as const }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signup failed'
    return { ok: false as const, error: message }
  }
}

// MERCHANT DASHBOARD EXPANSION — store-scoped coupon management
export async function getShopCouponsAction() {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await prisma.shop.findFirst({
      where: { ownerId: session.userId },
      select: { id: true },
    })
    if (!shop) return []

    return prisma.shopCoupon.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
    })
  } catch {
    return []
  }
}

export async function createShopCouponAction(input: {
  code: string
  offerType: 'FLAT' | 'PERCENT' | 'FREE_DELIVERY'
  discountValue: number
  minOrderValue?: number
  maxUses?: number
  expiresAt?: string
}) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await prisma.shop.findFirst({
      where: { ownerId: session.userId },
      select: { id: true },
    })
    if (!shop) return { ok: false as const, error: 'Shop not found' }

    const code = input.code.trim().toUpperCase()
    if (!code || code.length < 4) {
      return { ok: false as const, error: 'Coupon code must be at least 4 characters' }
    }

    const discountType =
      input.offerType === 'PERCENT' ? ('PERCENT' as const) : ('FLAT' as const)
    const discountValue =
      input.offerType === 'FREE_DELIVERY' ? 0 : input.discountValue

    if (input.offerType === 'PERCENT' && (discountValue <= 0 || discountValue > 80)) {
      return { ok: false as const, error: 'Percentage must be between 1 and 80' }
    }
    if (input.offerType === 'FLAT' && discountValue <= 0) {
      return { ok: false as const, error: 'Flat discount must be greater than 0' }
    }

    await prisma.shopCoupon.create({
      data: {
        shopId: shop.id,
        code,
        discountType,
        discountValue,
        minOrderValue: input.minOrderValue ?? 0,
        maxUses: input.maxUses ?? 100,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    })

    revalidatePath('/merchant')
    return { ok: true as const }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create coupon'
    return { ok: false as const, error: message }
  }
}

export async function getMerchantRealtimeAuthAction() {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await prisma.shop.findFirst({
      where: { ownerId: session.userId },
      select: { id: true, name: true },
    })
    if (!shop) {
      return { ok: false as const, error: 'No shop found for this merchant account' }
    }

    const token = await mintApiAccessToken(session.userId)
    return {
      ok: true as const,
      token,
      storeId: shop.id,
      storeName: shop.name,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Not authenticated'
    return { ok: false as const, error: message }
  }
}
