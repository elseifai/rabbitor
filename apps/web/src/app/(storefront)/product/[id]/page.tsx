import { ProductDetailView } from '@/components/products/ProductDetailView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  return <ProductDetailView productId={id} />
}
