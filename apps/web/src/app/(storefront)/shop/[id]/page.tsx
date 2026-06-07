import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SHOP_ID_TO_SLUG } from '@/lib/shop-catalog'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LegacyShopRedirectPage({ params }: Props) {
  const { id } = await params

  const staticSlug = SHOP_ID_TO_SLUG[id]
  if (staticSlug) redirect(`/shops/${staticSlug}`)

  const shop = await prisma.shop.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { slug: true },
  })
  if (shop) redirect(`/shops/${shop.slug}`)

  notFound()
}
