import type { StoreType } from '@rabbit/database'

// MERCHANT SIDEBAR & CATALOG REFACTOR — pre-compiled master item templates by store type
export type CatalogTemplate = {
  id: string
  name: string
  description: string
  category: string
  defaultUnit: string
  suggestedPrice: number
  imageUrl?: string
  variants?: { label: string; unit: string; priceDelta?: number }[]
}

const kirana: CatalogTemplate[] = [
  { id: 'kir-maggi', name: 'Maggi 2-Minute Noodles', description: 'Masala instant noodles — household staple', category: 'instant', defaultUnit: '70g pack', suggestedPrice: 14 },
  { id: 'kir-parle-g', name: 'Parle-G Gold Biscuits', description: 'Classic glucose biscuits', category: 'biscuits', defaultUnit: '250g pack', suggestedPrice: 30 },
  { id: 'kir-goodday', name: 'Britannia Good Day Cookies', description: 'Butter cashew cookies', category: 'biscuits', defaultUnit: '200g pack', suggestedPrice: 45 },
  { id: 'kir-sunflower', name: 'Fortune Sunflower Oil', description: 'Refined cooking oil', category: 'oils', defaultUnit: '1L pouch', suggestedPrice: 145, variants: [{ label: '500ml', unit: '500ml pouch', priceDelta: -70 }, { label: '1L', unit: '1L pouch' }] },
  { id: 'kir-tata-salt', name: 'Tata Salt', description: 'Iodised vacuum evaporated salt', category: 'staples', defaultUnit: '1kg pack', suggestedPrice: 28 },
  { id: 'kir-aashirvaad', name: 'Aashirvaad Atta', description: 'Whole wheat flour', category: 'flours', defaultUnit: '5kg bag', suggestedPrice: 285, variants: [{ label: '1kg', unit: '1kg pack', priceDelta: -220 }, { label: '5kg', unit: '5kg bag' }] },
  { id: 'kir-tur-dal', name: 'Toor Dal', description: 'Premium arhar dal', category: 'pulses', defaultUnit: '1kg', suggestedPrice: 165 },
  { id: 'kir-surf', name: 'Surf Excel Matic', description: 'Top load liquid detergent', category: 'household', defaultUnit: '1L bottle', suggestedPrice: 215 },
  { id: 'kir-lifebuoy', name: 'Lifebuoy Soap', description: 'Total germ protection bathing bar', category: 'soaps', defaultUnit: '125g x 3', suggestedPrice: 99 },
  { id: 'kir-colgate', name: 'Colgate MaxFresh', description: 'Cool mint toothpaste', category: 'personal-care', defaultUnit: '150g tube', suggestedPrice: 95 },
  { id: 'kir-lays', name: "Lay's Classic Salted", description: 'Potato chips', category: 'snacks', defaultUnit: '52g pack', suggestedPrice: 20 },
  { id: 'kir-bru', name: 'Bru Instant Coffee', description: 'Pure coffee granules', category: 'beverages', defaultUnit: '100g jar', suggestedPrice: 210 },
]

const fish: CatalogTemplate[] = [
  { id: 'fish-surmai', name: 'Surmai (Kingfish)', description: 'Fresh surmai steaks — premium catch', category: 'premium', defaultUnit: '500g', suggestedPrice: 650, variants: [{ label: '250g', unit: '250g', priceDelta: -325 }, { label: '500g', unit: '500g' }, { label: '1kg', unit: '1kg', priceDelta: 650 }] },
  { id: 'fish-prawns', name: 'Jumbo Prawns', description: 'Deveined medium prawns', category: 'shellfish', defaultUnit: '500g', suggestedPrice: 480 },
  { id: 'fish-bangda', name: 'Bangda (Mackerel)', description: 'Whole cleaned mackerel', category: 'local', defaultUnit: '500g', suggestedPrice: 220 },
  { id: 'fish-rohu', name: 'Rohu (Carp)', description: 'Fresh rohu cuts with head', category: 'freshwater', defaultUnit: '1kg', suggestedPrice: 320 },
  { id: 'fish-pomfret', name: 'Silver Pomfret', description: 'Whole pomfret — cleaned', category: 'premium', defaultUnit: '500g', suggestedPrice: 580 },
  { id: 'fish-crab', name: 'Blue Crab', description: 'Live blue crab', category: 'shellfish', defaultUnit: '1kg', suggestedPrice: 450 },
  { id: 'fish-bombil', name: 'Bombil (Bombay Duck)', description: 'Sun-dried bombil', category: 'dried', defaultUnit: '250g', suggestedPrice: 180 },
  { id: 'fish-katla', name: 'Katla Fish', description: 'Bengali-style katla steaks', category: 'freshwater', defaultUnit: '1kg', suggestedPrice: 340 },
  { id: 'fish-squid', name: 'Squid Rings', description: 'Cleaned squid rings', category: 'shellfish', defaultUnit: '500g', suggestedPrice: 390 },
  { id: 'fish-salmon', name: 'Norwegian Salmon Fillet', description: 'Imported salmon fillet', category: 'imported', defaultUnit: '250g', suggestedPrice: 720 },
]

const beauty: CatalogTemplate[] = [
  { id: 'beauty-lakme', name: 'Lakmé Absolute Foundation', description: 'Full coverage matte foundation', category: 'cosmetics', defaultUnit: '15ml', suggestedPrice: 650 },
  { id: 'beauty-nivea', name: 'Nivea Soft Moisturising Cream', description: 'Light daily moisturiser', category: 'skincare', defaultUnit: '100ml', suggestedPrice: 199 },
  { id: 'beauty-dove-shampoo', name: 'Dove Hair Therapy Shampoo', description: 'Intense repair shampoo', category: 'haircare', defaultUnit: '340ml', suggestedPrice: 285 },
  { id: 'beauty-pantene', name: 'Pantene Pro-V Conditioner', description: 'Smooth & strong conditioner', category: 'haircare', defaultUnit: '180ml', suggestedPrice: 175 },
  { id: 'beauty-himalaya', name: 'Himalaya Neem Face Wash', description: 'Purifying neem & turmeric wash', category: 'skincare', defaultUnit: '150ml', suggestedPrice: 165 },
  { id: 'beauty-gillette', name: 'Gillette Fusion Razor', description: '5-blade cartridge razor', category: 'grooming', defaultUnit: '1 unit', suggestedPrice: 299 },
  { id: 'beauty-dettol', name: 'Dettol Hand Sanitizer', description: 'Original germ protection', category: 'wellness', defaultUnit: '200ml', suggestedPrice: 99 },
  { id: 'beauty-ponds', name: 'Pond\'s Light Moisturiser', description: 'Non-oily daily cream', category: 'skincare', defaultUnit: '75ml', suggestedPrice: 145 },
]

const vegetable: CatalogTemplate[] = [
  { id: 'veg-tomato', name: 'Tomato (Tamatar)', description: 'Farm-fresh red tomatoes', category: 'vegetables', defaultUnit: '1kg', suggestedPrice: 40 },
  { id: 'veg-onion', name: 'Onion (Pyaz)', description: 'Nasik red onions', category: 'vegetables', defaultUnit: '1kg', suggestedPrice: 35 },
  { id: 'veg-potato', name: 'Potato (Aloo)', description: 'Washed table potatoes', category: 'vegetables', defaultUnit: '1kg', suggestedPrice: 30 },
  { id: 'veg-spinach', name: 'Spinach (Palak)', description: 'Bundled fresh palak', category: 'leafy', defaultUnit: '250g bunch', suggestedPrice: 25 },
  { id: 'veg-banana', name: 'Banana (Kela)', description: 'Robusta bananas', category: 'fruits', defaultUnit: '1 dozen', suggestedPrice: 55 },
  { id: 'veg-apple', name: 'Apple (Seb)', description: 'Kashmiri red apples', category: 'fruits', defaultUnit: '1kg', suggestedPrice: 180 },
  { id: 'veg-mango', name: 'Alphonso Mango', description: 'Ratnagiri alphonso — seasonal', category: 'fruits', defaultUnit: '1 dozen', suggestedPrice: 650 },
  { id: 'veg-capsicum', name: 'Capsicum (Shimla Mirch)', description: 'Green bell peppers', category: 'vegetables', defaultUnit: '500g', suggestedPrice: 45 },
]

const pharmacy: CatalogTemplate[] = [
  { id: 'pharm-paracetamol', name: 'Paracetamol 500mg', description: 'Pain & fever relief tablets', category: 'otc', defaultUnit: 'strip of 15', suggestedPrice: 25 },
  { id: 'pharm-crocin', name: 'Crocin Advance', description: 'Fast pain relief', category: 'otc', defaultUnit: 'strip of 15', suggestedPrice: 35 },
  { id: 'pharm-dolo', name: 'Dolo 650', description: 'Paracetamol 650mg tablets', category: 'otc', defaultUnit: 'strip of 15', suggestedPrice: 32 },
  { id: 'pharm-bandaid', name: 'Band-Aid Washproof', description: 'Adhesive bandages', category: 'first-aid', defaultUnit: 'pack of 10', suggestedPrice: 55 },
  { id: 'pharm-ors', name: 'Electral ORS', description: 'Oral rehydration salts', category: 'wellness', defaultUnit: 'sachet x 5', suggestedPrice: 45 },
  ...beauty,
]

const bakery: CatalogTemplate[] = [
  { id: 'bakery-pav', name: 'Pav Bread', description: 'Soft Mumbai-style pav', category: 'bread', defaultUnit: '6 pcs', suggestedPrice: 30 },
  { id: 'bakery-bun', name: 'Burger Bun', description: 'Sesame burger buns', category: 'bread', defaultUnit: '4 pcs', suggestedPrice: 40 },
  { id: 'bakery-cake', name: 'Chocolate Truffle Cake', description: 'Eggless truffle slice cake', category: 'cakes', defaultUnit: '500g', suggestedPrice: 450 },
  { id: 'bakery-croissant', name: 'Butter Croissant', description: 'Flaky French croissant', category: 'pastry', defaultUnit: '1 pc', suggestedPrice: 65 },
  { id: 'bakery-rusk', name: 'Tea Rusk', description: 'Crispy milk rusk', category: 'snacks', defaultUnit: '400g pack', suggestedPrice: 85 },
]

const dairy: CatalogTemplate[] = [
  { id: 'dairy-amul-milk', name: 'Amul Taaza Milk', description: 'Homogenised toned milk', category: 'milk', defaultUnit: '1L pouch', suggestedPrice: 58 },
  { id: 'dairy-curd', name: 'Fresh Curd (Dahi)', description: 'Set curd — daily made', category: 'curd', defaultUnit: '500g', suggestedPrice: 35 },
  { id: 'dairy-paneer', name: 'Malai Paneer', description: 'Soft cottage cheese block', category: 'cheese', defaultUnit: '200g', suggestedPrice: 95 },
  { id: 'dairy-butter', name: 'Amul Butter', description: 'Pasteurised table butter', category: 'butter', defaultUnit: '100g', suggestedPrice: 58 },
  { id: 'dairy-eggs', name: 'Farm Eggs', description: 'White eggs — grade A', category: 'eggs', defaultUnit: '6 pcs', suggestedPrice: 48 },
]

const meat: CatalogTemplate[] = [
  { id: 'meat-chicken', name: 'Chicken Curry Cut', description: 'Skinless curry cut pieces', category: 'poultry', defaultUnit: '1kg', suggestedPrice: 220 },
  { id: 'meat-breast', name: 'Chicken Breast Boneless', description: 'Lean boneless breast', category: 'poultry', defaultUnit: '500g', suggestedPrice: 195 },
  { id: 'meat-mutton', name: 'Mutton Curry Cut', description: 'Fresh goat curry cut', category: 'red-meat', defaultUnit: '1kg', suggestedPrice: 780 },
  { id: 'meat-keema', name: 'Chicken Keema', description: 'Minced chicken', category: 'poultry', defaultUnit: '500g', suggestedPrice: 175 },
]

const general: CatalogTemplate[] = [
  { id: 'gen-water', name: 'Bisleri Water', description: 'Packaged drinking water', category: 'beverages', defaultUnit: '1L bottle', suggestedPrice: 20 },
  { id: 'gen-bread', name: 'Sandwich Bread', description: 'White sandwich loaf', category: 'staples', defaultUnit: '400g', suggestedPrice: 45 },
  { id: 'gen-eggs', name: 'Brown Eggs', description: 'Free-range brown eggs', category: 'staples', defaultUnit: '6 pcs', suggestedPrice: 55 },
  ...kirana.slice(0, 6),
]

// MERCHANT SIDEBAR & CATALOG REFACTOR — store-type → template catalog map
export const MASTER_CATALOG: Record<StoreType, CatalogTemplate[]> = {
  KIRANA: kirana,
  FISH: fish,
  VEGETABLE: vegetable,
  PHARMACY: pharmacy,
  BAKERY: bakery,
  DAIRY: dairy,
  MEAT: meat,
  GENERAL: general,
}

export const CATALOG_CATEGORY_LABELS: Record<string, string> = {
  instant: 'Instant Foods',
  biscuits: 'Biscuits',
  oils: 'Oils',
  staples: 'Staples',
  flours: 'Flours',
  pulses: 'Pulses',
  household: 'Household',
  soaps: 'Soaps',
  snacks: 'Snacks',
  beverages: 'Beverages',
  premium: 'Premium Catch',
  shellfish: 'Shellfish',
  local: 'Local Catch',
  freshwater: 'Freshwater',
  dried: 'Dried Fish',
  imported: 'Imported',
  cosmetics: 'Cosmetics',
  skincare: 'Skincare',
  haircare: 'Haircare',
  grooming: 'Grooming',
  wellness: 'Wellness',
  vegetables: 'Vegetables',
  leafy: 'Leafy Greens',
  fruits: 'Fruits',
  otc: 'OTC Medicine',
  'first-aid': 'First Aid',
  bread: 'Bread',
  cakes: 'Cakes',
  pastry: 'Pastry',
  milk: 'Milk',
  curd: 'Curd',
  cheese: 'Cheese',
  butter: 'Butter',
  eggs: 'Eggs',
  poultry: 'Poultry',
  'red-meat': 'Red Meat',
  'personal-care': 'Personal Care',
}

export function getCatalogForStoreType(storeType: StoreType): CatalogTemplate[] {
  return MASTER_CATALOG[storeType] ?? MASTER_CATALOG.GENERAL
}

export function searchCatalogTemplates(
  storeType: StoreType,
  query: string,
  categoryFilter?: string,
): CatalogTemplate[] {
  const items = getCatalogForStoreType(storeType)
  const q = query.trim().toLowerCase()
  return items.filter((item) => {
    const matchCategory = !categoryFilter || categoryFilter === 'ALL' || item.category === categoryFilter
    const matchQuery =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    return matchCategory && matchQuery
  })
}

export function getCatalogCategories(storeType: StoreType): string[] {
  const cats = new Set(getCatalogForStoreType(storeType).map((i) => i.category))
  return ['ALL', ...Array.from(cats).sort()]
}
