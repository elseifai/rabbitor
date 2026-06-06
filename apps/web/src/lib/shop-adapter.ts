import type { ProductExtra, ShopMeta } from '@/components/shop/ShopSwiggyClient'
import type { CatalogShop } from '@/lib/shop-catalog'

const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=200&q=80'

type DbShop = {
  id: string
  slug: string
  name: string
  category: string
  address: string
  avgPrepMinutes: number
  products: Array<{
    id: string
    name: string
    price: number
    unit: string
    description: string | null
    image: string | null
  }>
}

export function dbShopToSwiggyProps(shop: DbShop): {
  shop: CatalogShop
  meta: ShopMeta
  productExtras: Record<string, ProductExtra>
} {
  const categories = ['Bestsellers', shop.category]

  const productExtras = Object.fromEntries(
    shop.products.map((p, index) => [
      p.id,
      {
        desc: p.description ?? 'Fresh from your local neighbourhood shop.',
        rating: '4.5',
        image: p.image ?? DEFAULT_PRODUCT_IMAGE,
        category: index < Math.min(2, shop.products.length) ? 'Bestsellers' : shop.category,
      },
    ]),
  )

  return {
    shop: {
      id: shop.id,
      slug: shop.slug,
      name: shop.name,
      products: shop.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        unit: p.unit,
      })),
    },
    meta: {
      subtitle: `${shop.category} • ${shop.address}`,
      rating: '4.4',
      eta: `${shop.avgPrepMinutes}-${shop.avgPrepMinutes + 5} Mins Delivery`,
      categories,
    },
    productExtras,
  }
}
