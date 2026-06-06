export type StarterProduct = {
  name: string
  price: number
  unit: string
  description: string
}

const BY_CATEGORY: Record<string, StarterProduct[]> = {
  Kirana: [
    { name: 'Basmati Rice 1kg', price: 120, unit: 'kg', description: 'Daily staple rice pack.' },
    { name: 'Toor Dal 500g', price: 85, unit: 'gm', description: 'Protein-rich household dal.' },
    { name: 'Sunflower Oil 1L', price: 165, unit: 'piece', description: 'Refined cooking oil.' },
  ],
  'Fish Shop': [
    { name: 'Pomfret (Whole)', price: 450, unit: 'kg', description: 'Fresh whole pomfret.' },
    { name: 'Prawns Cleaned', price: 380, unit: 'gm', description: 'Deveined daily catch.' },
    { name: 'Surmai Steaks', price: 490, unit: 'kg', description: 'Premium seer fish steaks.' },
  ],
  Footwear: [
    { name: 'Running Shoes', price: 1299, unit: 'pair', description: 'Lightweight street runners.' },
    { name: 'Leather Sandals', price: 699, unit: 'pair', description: 'Handcrafted local sandals.' },
  ],
  Vegetables: [
    { name: 'Tomatoes', price: 40, unit: 'kg', description: 'Farm-fresh red tomatoes.' },
    { name: 'Palak Bunch', price: 25, unit: 'piece', description: 'Leafy greens bundle.' },
    { name: 'Onions 1kg', price: 35, unit: 'kg', description: 'Daily kitchen essential.' },
  ],
  Pharmacy: [
    { name: 'Paracetamol Strip', price: 30, unit: 'strip', description: 'Pain relief tablets.' },
    { name: 'ORS Sachets (5)', price: 45, unit: 'pack', description: 'Hydration electrolyte mix.' },
  ],
  Clothing: [
    { name: 'Cotton T-Shirt', price: 399, unit: 'piece', description: 'Breathable daily wear.' },
    { name: 'Denim Jeans', price: 899, unit: 'piece', description: 'Classic fit jeans.' },
  ],
}

const DEFAULT_STARTERS: StarterProduct[] = [
  { name: 'Bestseller Pack A', price: 199, unit: 'piece', description: 'Curated starter item.' },
  { name: 'Bestseller Pack B', price: 299, unit: 'piece', description: 'Popular local pick.' },
  { name: 'Value Combo', price: 449, unit: 'pack', description: 'Great for first orders.' },
]

export function starterProductsForCategory(category: string): StarterProduct[] {
  const exact = BY_CATEGORY[category.trim()]
  if (exact) return exact

  const fuzzy = Object.entries(BY_CATEGORY).find(([key]) =>
    category.toLowerCase().includes(key.toLowerCase()),
  )
  if (fuzzy) return fuzzy[1]

  return DEFAULT_STARTERS
}
