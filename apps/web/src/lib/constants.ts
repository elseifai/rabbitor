import {
  ShoppingBasket,
  Fish,
  Footprints,
  Shirt,
  Carrot,
  Pill,
  type LucideIcon,
} from 'lucide-react'
import type { ShopCategory } from '@/types'

export const HOME_CATEGORIES: {
  id: ShopCategory
  name: string
  description: string
  icon: LucideIcon
  color: string
  bg: string
}[] = [
  {
    id: 'groceries',
    name: 'Groceries',
    description: 'Kirana staples & daily needs',
    icon: ShoppingBasket,
    color: 'text-amber-700',
    bg: 'bg-amber-50 hover:bg-amber-100',
  },
  {
    id: 'fresh-fish',
    name: 'Fresh Fish',
    description: 'Daily catch from local fish markets',
    icon: Fish,
    color: 'text-sky-700',
    bg: 'bg-sky-50 hover:bg-sky-100',
  },
  {
    id: 'footwear',
    name: 'Footwear',
    description: 'Shoes & sandals from local stores',
    icon: Footprints,
    color: 'text-violet-700',
    bg: 'bg-violet-50 hover:bg-violet-100',
  },
  {
    id: 'clothing',
    name: 'Clothing',
    description: 'Neighbourhood fashion & apparel',
    icon: Shirt,
    color: 'text-rose-700',
    bg: 'bg-rose-50 hover:bg-rose-100',
  },
  {
    id: 'vegetables',
    name: 'Vegetables',
    description: 'Farm-fresh sabzi from sabzi mandi',
    icon: Carrot,
    color: 'text-green-700',
    bg: 'bg-green-50 hover:bg-green-100',
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    description: 'Medicines & wellness essentials',
    icon: Pill,
    color: 'text-teal-700',
    bg: 'bg-teal-50 hover:bg-teal-100',
  },
]

export const FEATURED_SHOPS = [
  {
    id: '1',
    slug: 'sharma-kirana',
    name: 'Sharma Kirana Store',
    type: 'Kirana',
    rating: 4.8,
    deliveryMins: 15,
    distance: '0.8 km',
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=300&fit=crop&auto=format&fm=jpg',
    tags: ['Groceries', 'Staples'],
    isActive: true,
  },
  {
    id: '2',
    slug: 'coastal-fish',
    name: 'Coastal Fresh Fish',
    type: 'Fish Market',
    rating: 4.9,
    deliveryMins: 20,
    distance: '1.2 km',
    image: 'https://images.unsplash.com/photo-1544551763-77ef2fcb3c79?w=400&h=300&fit=crop&auto=format&fm=jpg',
    tags: ['Fresh Fish', 'Seafood'],
    isActive: true,
  },
  {
    id: '3',
    slug: 'walkwell-footwear',
    name: 'WalkWell Footwear',
    type: 'Footwear',
    rating: 4.6,
    deliveryMins: 25,
    distance: '1.5 km',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop&auto=format&fm=jpg',
    tags: ['Shoes', 'Sandals'],
    isActive: true,
  },
  {
    id: '4',
    slug: 'patel-vegetables',
    name: 'Patel Vegetables',
    type: 'Sabzi Mandi',
    rating: 4.7,
    deliveryMins: 18,
    distance: '0.5 km',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop&auto=format&fm=jpg',
    tags: ['Vegetables', 'Organic'],
    isActive: false,
  },
]

export const SAVED_LOCATIONS = [
  { id: 'home', label: 'Home', area: 'Andheri West, Mumbai', pincode: '400058', latitude: 19.1364, longitude: 72.8296 },
  { id: 'work', label: 'Work', area: 'BKC, Mumbai', pincode: '400051', latitude: 19.068, longitude: 72.869 },
]
