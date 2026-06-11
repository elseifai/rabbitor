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
