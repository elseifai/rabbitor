import { prisma } from '@/lib/prisma'
import { getCatalogProductName } from '@/lib/shop-catalog'

export async function resolveShop(shopIdOrSlug: string) {
  return prisma.shop.findFirst({
    where: { OR: [{ id: shopIdOrSlug }, { slug: shopIdOrSlug }] },
    include: { products: true },
  })
}

export async function resolveProductForShop(
  shopId: string,
  productId: string,
  shopProducts?: Array<{ id: string; name: string; price: number; stock: number; isAvailable: boolean }>,
) {
  const fromInclude = shopProducts?.find((p) => p.id === productId)
  if (fromInclude?.isAvailable) return fromInclude

  let product = await prisma.product.findFirst({
    where: { id: productId, shopId },
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
