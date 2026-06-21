import { prisma } from '@/lib/prisma'
import { getCatalogProductName } from '@/lib/shop-catalog'
import { isEssentialsStoreId } from '@/lib/essentials-catalog'

export async function resolveShop(shopIdOrSlug: string) {
  return prisma.shop.findFirst({
    where: { OR: [{ id: shopIdOrSlug }, { slug: shopIdOrSlug }] },
    include: { products: true },
  })
}

export async function resolveProductForShop(
  shopId: string,
  productId: string,
  shopProducts?: Array<{
    id: string
    name: string
    price: number
    stock: number
    isAvailable: boolean
    masterCatalogItemId?: string | null
  }>,
) {
  const fromInclude = shopProducts?.find(
    (p) => p.id === productId || p.masterCatalogItemId === productId,
  )
  if (fromInclude?.isAvailable) return fromInclude

  let product = await prisma.product.findFirst({
    where: {
      shopId,
      OR: [{ id: productId }, { masterCatalogItemId: productId }],
    },
  })

  if (!product) {
    const catalogName = getCatalogProductName(productId)
    if (catalogName) {
      product = await prisma.product.findFirst({
        where: {
          shopId,
          name: { equals: catalogName, mode: 'insensitive' },
        },
      })
    }
  }

  return product
}

/** Resolve global-catalog cart lines to real shop products at the fulfillment store. */
export async function resolveEssentialsCheckoutShop(
  fulfillmentStoreId: string,
  lineItems: Array<{ productId: string; quantity: number; price: number }>,
) {
  const shop = await resolveShop(fulfillmentStoreId)
  if (!shop) throw new Error('Fulfillment store not found')
  if (!shop.isActive) throw new Error(`${shop.name} is currently closed`)

  const resolved: Array<{ productId: string; quantity: number; price: number }> = []

  for (const item of lineItems) {
    const product = await resolveProductForShop(shop.id, item.productId, shop.products)
    if (!product || !product.isAvailable) {
      throw new Error(`Item unavailable at ${shop.name}`)
    }
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`)
    }
    resolved.push({
      productId: product.id,
      quantity: item.quantity,
      price: product.price,
    })
  }

  return { shopId: shop.id, items: resolved }
}

export function normalizeCheckoutShopsInput(
  input: {
    shops?: Array<{ shopId: string; items: Array<{ productId: string; quantity: number; price: number }> }>
    fulfillmentStoreId?: string
  },
): Array<{ shopId: string; items: Array<{ productId: string; quantity: number; price: number }> }> {
  const shops = input.shops?.filter((s) => s.shopId && s.items?.length) ?? []
  if (shops.length === 0) return []

  const hasEssentialsOnly = shops.every((s) => isEssentialsStoreId(s.shopId))
  if (hasEssentialsOnly && input.fulfillmentStoreId) {
    const allItems = shops.flatMap((s) => s.items)
    return [{ shopId: input.fulfillmentStoreId, items: allItems }]
  }

  return shops.filter((s) => !isEssentialsStoreId(s.shopId))
}

export function productUnavailableMessage(productId: string, productName?: string | null): string {
  if (productName) {
    return `${productName} is no longer available. Clear your cart and add items again.`
  }
  const catalogName = getCatalogProductName(productId)
  if (catalogName) {
    return `${catalogName} is no longer available. Clear your cart and add items again.`
  }
  return 'Some items in your cart are outdated. Clear your cart and add fresh items from the shop.'
}
