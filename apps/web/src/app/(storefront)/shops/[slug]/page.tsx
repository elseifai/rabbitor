import { notFound } from 'next/navigation'
import { getShopBySlug } from '@/actions/shops'
import { ShopDetailClient } from '@/components/shops/ShopDetailClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ShopPage({ params }: Props) {
  const { slug } = await params
  const shop = await getShopBySlug(slug)
  if (!shop) notFound()

  return (
    <ShopDetailClient
      shop={{
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        isActive: shop.isActive,
        address: shop.address,
        minOrderValue: shop.minOrderValue,
        baseDeliveryFee: shop.baseDeliveryFee,
        avgPrepMinutes: shop.avgPrepMinutes,
        products: shop.products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          unit: p.unit,
          image: p.image,
          isAvailable: p.isAvailable,
          description: p.description,
        })),
      }}
    />
  )
}
