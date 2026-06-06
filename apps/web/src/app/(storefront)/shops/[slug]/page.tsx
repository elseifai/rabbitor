import { notFound } from 'next/navigation'
import { getShopBySlug } from '@/actions/shops'
import { ShopSwiggyClient } from '@/components/shop/ShopSwiggyClient'
import { dbShopToSwiggyProps } from '@/lib/shop-adapter'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ShopPage({ params }: Props) {
  const { slug } = await params
  const shop = await getShopBySlug(slug)
  if (!shop) notFound()

  const props = dbShopToSwiggyProps(shop)
  return (
    <ShopSwiggyClient
      shop={props.shop}
      meta={props.meta}
      productExtras={props.productExtras}
    />
  )
}
