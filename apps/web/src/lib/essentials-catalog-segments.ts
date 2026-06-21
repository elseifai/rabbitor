/**
 * Essentials catalog segments — maps home-feed tiles and URL slugs to products.
 * Products are classified by subcategory, DB category, and product name keywords.
 */

import type { StoreType } from '@rabbit/database'

export type CatalogSegmentSlug =
  | 'veggies'
  | 'dairy'
  | 'atta-rice-oil-dals'
  | 'meat-fish-eggs'
  | 'masala-dry-fruits'
  | 'breakfast-sauces'
  | 'packaged-food'
  | 'frozen-food'
  | 'tea-coffee'
  | 'ice-cream'
  | 'cold-drinks'
  | 'munchies'
  | 'biscuits-cookies'
  | 'noodles-pasta'
  | 'spreads-dips'
  | 'sweet-cravings'
  | 'pharmacy'
  | 'kirana'

export const CATALOG_SEGMENT_LABELS: Record<CatalogSegmentSlug, string> = {
  veggies: 'Fruits & Vegetables',
  dairy: 'Dairy, Bread & Eggs',
  'atta-rice-oil-dals': 'Atta, Rice, Oil & Dals',
  'meat-fish-eggs': 'Meat, Fish & Eggs',
  'masala-dry-fruits': 'Masala & Dry Fruits',
  'breakfast-sauces': 'Breakfast & Sauces',
  'packaged-food': 'Packaged Food',
  'frozen-food': 'Frozen Food',
  'tea-coffee': 'Tea, Coffee & More',
  'ice-cream': 'Ice Creams & More',
  'cold-drinks': 'Cold Drinks & Juices',
  munchies: 'Munchies',
  'biscuits-cookies': 'Biscuits & Cookies',
  'noodles-pasta': 'Noodles & Pasta',
  'spreads-dips': 'Spreads & Dips',
  'sweet-cravings': 'Sweet Cravings',
  pharmacy: 'Pharmacy',
  kirana: 'Grocery & Kitchen',
}

/** Home-feed tile label → segment slug (handles CMS tiles still using generic kirana/fish). */
export const HOME_TILE_LABEL_TO_SEGMENT: Record<string, CatalogSegmentSlug> = {
  'Fruits & Vegetables': 'veggies',
  'Dairy, Bread & Eggs': 'dairy',
  'Atta, Rice, Oil & Dals': 'atta-rice-oil-dals',
  'Meat, Fish & Eggs': 'meat-fish-eggs',
  'Masala & Dry Fruits': 'masala-dry-fruits',
  'Breakfast & Sauces': 'breakfast-sauces',
  'Packaged Food': 'packaged-food',
  'Frozen Food': 'frozen-food',
  'Tea, Coffee & More': 'tea-coffee',
  'Ice Creams & More': 'ice-cream',
  'Sweet Cravings': 'sweet-cravings',
  'Cold Drinks & Juices': 'cold-drinks',
  Munchies: 'munchies',
  'Biscuits & Cookies': 'biscuits-cookies',
  'Noodles & Pasta': 'noodles-pasta',
  'Spreads & Dips': 'spreads-dips',
}

/** Legacy broad URL slugs → default segment for tab navigation. */
export const LEGACY_CATEGORY_TO_SEGMENT: Record<string, CatalogSegmentSlug> = {
  veggies: 'veggies',
  vegetables: 'veggies',
  vegetable: 'veggies',
  dairy: 'dairy',
  fish: 'meat-fish-eggs',
  'fresh-fish': 'meat-fish-eggs',
  meat: 'meat-fish-eggs',
  pharmacy: 'pharmacy',
  kirana: 'kirana',
  groceries: 'kirana',
  grocery: 'kirana',
}

export const ALL_CATALOG_SEGMENT_SLUGS = Object.keys(
  CATALOG_SEGMENT_LABELS,
) as CatalogSegmentSlug[]

export function isCatalogSegmentSlug(slug: string): slug is CatalogSegmentSlug {
  return ALL_CATALOG_SEGMENT_SLUGS.includes(slug as CatalogSegmentSlug)
}

export function normalizeCatalogSegmentSlug(raw: string): CatalogSegmentSlug | null {
  const lower = raw.trim().toLowerCase()
  if (isCatalogSegmentSlug(lower)) return lower
  return LEGACY_CATEGORY_TO_SEGMENT[lower] ?? null
}

export function resolveSegmentFromTile(label: string, category: string): CatalogSegmentSlug {
  return (
    HOME_TILE_LABEL_TO_SEGMENT[label.trim()] ??
    normalizeCatalogSegmentSlug(category) ??
    'kirana'
  )
}

type ClassifyInput = {
  name: string
  category: string
  subcategory: string | null
  storeType: StoreType | string
}

function hay(input: ClassifyInput): string {
  return `${input.name} ${input.subcategory ?? ''} ${input.category}`.toLowerCase()
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text))
}

function isFreshProduce(text: string, input: ClassifyInput): boolean {
  if (input.category === 'fresh-fruits' || input.category === 'fresh-vegetables') return true
  const sub = (input.subcategory ?? '').toLowerCase()
  if (sub === 'fresh fruits' || sub === 'fresh vegetables') return true
  if (matchesAny(text, [/\b(powder|masala|seeds|seed\b|chutney|combo|toffee|spice|organic india)\b/])) {
    return false
  }
  return matchesAny(text, [
    /\b(tomato|onion|potato|carrot|capsicum|broccoli|cabbage|cauliflower|spinach|palak|methi leaves|coriander leaves|mint|apple|banana|orange|mango|grape|pomegranate|watermelon|papaya|kinnaur|shimla|granny smith)\b/,
  ])
}

function isEggProduct(text: string): boolean {
  if (matchesAny(text, [/\b(eggplant|veggie egg)\b/])) return false
  if (matchesAny(text, [/\b(atta|chapati|flour|rice|noodle|biscuit|bread|powder|masala|sauce|jam)\b/])) {
    return false
  }
  return matchesAny(text, [
    /\b(boiled eggs?|\d+\s*pcs?\s*-?\s*boiled eggs?)\b/,
    /\b(brown eggs?|white eggs?|country eggs?|farm eggs?)\b/,
    /\beggs\b/,
    /\begg\b/,
  ])
}

function isRawMeatFish(text: string, input: ClassifyInput): boolean {
  const sub = (input.subcategory ?? '').toLowerCase()
  if (sub === 'chicken & mutton' || sub === 'fish & seafood') {
    if (matchesAny(text, [/\b(powder|masala|nugget|sausage|salami|spread)\b/])) return false
    return true
  }
  if (matchesAny(text, [/\b(powder|masala|nugget|finger|popcorn|sausage)\b/])) return false
  return matchesAny(text, [
    /\b(chicken|mutton|lamb|goat|fish|prawn|shrimp|crab|lobster|surmai|rohu|pomfret|salmon|tuna|seafood|curry cut|boneless|liver|drumstick)\b/,
  ])
}

function isAttaRiceOilDal(text: string): boolean {
  return matchesAny(text, [
    /\b(atta|flour|wheat|multigrain|rice|basmati|sona masoori|poha|suji|rava|sooji|besan|dal|lentil|moong|urad|chana|toor|masoor|arhar|oil|sunflower|mustard oil|groundnut|soya refined|ghee|sugar|salt|jaggery)\b/,
  ])
}

function isMasalaDryFruit(text: string, input: ClassifyInput): boolean {
  if (input.category === 'herbs-leafy-greens') return true
  return matchesAny(text, [
    /\b(powder|masala|spice|fenugreek|coriander powder|turmeric|chilli|chili|jeera|cumin|cardamom|pepper|clove|nutmeg|dry fruit|almond|cashew|raisin|pista|walnut|kaju|badam|dates|anjeer)\b/,
  ])
}

function isFrozen(text: string): boolean {
  return matchesAny(text, [/\bfrozen\b/, /\bfreshly frozen\b/, /\bfreezed\b/])
}

function isIceCream(text: string): boolean {
  return matchesAny(text, [/\b(ice cream|ice-cream|kulfi|frozen dessert|sorbet)\b/])
}

function isTeaCoffee(text: string): boolean {
  return matchesAny(text, [/\b(tea|coffee|chai|green tea|herbal tea|espresso)\b/])
}

function isColdDrink(text: string): boolean {
  return matchesAny(text, [
    /\b(juice|cola|pepsi|coke|soda|lemonade|drink|beverage|sprite|fanta|mazaa|maaza|energy drink)\b/,
  ])
}

function isMunchies(text: string): boolean {
  return matchesAny(text, [/\b(chips|namkeen|kurkure|lays|snack|bhujia|mixture|popcorn)\b/])
}

function isBiscuitsCookies(text: string): boolean {
  return matchesAny(text, [/\b(biscuit|cookie|cracker|rusk|marie|parle-g)\b/])
}

function isNoodlesPasta(text: string): boolean {
  return matchesAny(text, [/\b(noodle|maggi|pasta|macaroni|spaghetti|vermicelli|sevai)\b/])
}

function isSpreadsDips(text: string): boolean {
  return matchesAny(text, [/\b(spread|dip|pickle|mayonnaise|mayo|hummus|chutney)\b/])
}

function isSweet(text: string): boolean {
  return matchesAny(text, [/\b(chocolate|candy|sweet|mithai|toffee|lollipop|gummy|cadbury)\b/])
}

function isBreakfastSauces(text: string): boolean {
  return matchesAny(text, [
    /\b(cereal|oats|muesli|cornflakes|breakfast|ketchup|sauce|honey|jam|peanut butter|nutella|mayonnaise)\b/,
  ])
}

function isPackagedFood(text: string): boolean {
  if (isNoodlesPasta(text) || isBiscuitsCookies(text) || isMunchies(text)) return false
  return matchesAny(text, [
    /\b(packaged|ready to eat|rte|instant mix|soup|meal kit|cup soup|heat and eat)\b/,
    /\b(can|tin|pouch|retort)\b/,
  ])
}

function isDairy(text: string, input: ClassifyInput): boolean {
  const sub = (input.subcategory ?? '').toLowerCase()
  if (
    sub === 'milk & paneer' ||
    sub === 'curd & yoghurt' ||
    sub === 'butter & cheese' ||
    sub === 'bread & bakery'
  ) {
    return true
  }
  if (input.storeType === 'DAIRY') return true
  return matchesAny(text, [
    /\b(milk|paneer|curd|yoghurt|yogurt|butter|cheese|ghee|bread|pav|bun|loaf|cream|lassi|buttermilk)\b/,
  ])
}

/** Infer the best segment for a master catalog row (name-first when DB category is wrong). */
export function resolveProductCatalogSegment(input: ClassifyInput): CatalogSegmentSlug {
  const text = hay(input)

  if (input.storeType === 'PHARMACY') return 'pharmacy'
  if (isPharmacy(text)) return 'pharmacy'

  if (isEggProduct(text) || isRawMeatFish(text, input)) return 'meat-fish-eggs'
  if (isIceCream(text)) return 'ice-cream'
  if (isFrozen(text)) return 'frozen-food'
  if (isTeaCoffee(text) && !isMasalaDryFruit(text, input)) return 'tea-coffee'
  if (isColdDrink(text)) return 'cold-drinks'
  if (isBiscuitsCookies(text)) return 'biscuits-cookies'
  if (isNoodlesPasta(text)) return 'noodles-pasta'
  if (isMunchies(text)) return 'munchies'
  if (isSweet(text)) return 'sweet-cravings'
  if (isSpreadsDips(text)) return 'spreads-dips'

  if (isMasalaDryFruit(text, input)) return 'masala-dry-fruits'
  if (isAttaRiceOilDal(text)) return 'atta-rice-oil-dals'
  if (isFreshProduce(text, input)) return 'veggies'
  if (isDairy(text, input)) return 'dairy'
  if (isBreakfastSauces(text)) return 'breakfast-sauces'
  if (isPackagedFood(text)) return 'packaged-food'

  if (input.storeType === 'VEGETABLE' && input.category === 'herbs-leafy-greens') {
    return 'masala-dry-fruits'
  }

  return 'kirana'
}

function isPharmacy(text: string): boolean {
  return matchesAny(text, [
    /\b(medicine|tablet|capsule|syrup|paracetamol|aspirin|bandage|vitamin|supplement|pharmacy)\b/,
  ])
}

export function filterProductsBySegment<
  T extends ClassifyInput & { id: string; unit?: string },
>(items: T[], segment: CatalogSegmentSlug): T[] {
  if (segment === 'kirana') {
    const kiranaSegments: CatalogSegmentSlug[] = [
      'atta-rice-oil-dals',
      'masala-dry-fruits',
      'breakfast-sauces',
      'packaged-food',
      'frozen-food',
      'tea-coffee',
      'cold-drinks',
      'munchies',
      'biscuits-cookies',
      'noodles-pasta',
      'spreads-dips',
      'sweet-cravings',
    ]
    return items.filter((item) => kiranaSegments.includes(resolveProductCatalogSegment(item)))
  }

  return items.filter((item) => resolveProductCatalogSegment(item) === segment)
}

export function segmentLabel(slug: string): string {
  const normalized = normalizeCatalogSegmentSlug(slug)
  if (normalized) return CATALOG_SEGMENT_LABELS[normalized]
  return slug
}
