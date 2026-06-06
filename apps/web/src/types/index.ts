export type ShopCategory =
  | 'groceries'
  | 'fresh-fish'
  | 'footwear'
  | 'clothing'
  | 'vegetables'
  | 'pharmacy'

export interface CartItem {
  productId: string
  shopId: string
  shopName: string
  shopSlug: string
  name: string
  price: number
  quantity: number
  unit?: string
  image?: string
}

export interface LocationState {
  label: string
  area: string
  pincode: string
  latitude?: number
  longitude?: number
}

export interface FeaturedShop {
  id: string
  name: string
  type: string
  rating: number
  deliveryMins: number
  distance: string
  image: string
  tags: string[]
  isActive: boolean
}
