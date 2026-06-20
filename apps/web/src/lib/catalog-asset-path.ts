/**
 * Deterministic, brand/variant-aware catalog asset URL generator.
 *
 * Generates a `/media/catalog/{snake_slug}.jpg` path from any product name.
 * The `/media/catalog/` route handles CDN fallback automatically when no
 * local file exists on disk — so every product always gets an appropriate image.
 *
 * Examples:
 *   "Priya Refined Sunflower Oil"           → /media/catalog/priya_refined_sunflower_oil.jpg
 *   "Head & Shoulders Anti-Dandruff 90 mL"  → /media/catalog/head_shoulders_anti_dandruff_90_ml.jpg
 *   "Maggi Masala Instant Noodles (6 Pack)" → /media/catalog/maggi_masala_instant_noodles_6_pack.jpg
 */
export function getProductAssetPath(name: string, _category?: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[()[\]{}'"]/g, ' ')   // strip brackets/quotes
    .replace(/&/g, ' and ')          // ampersand → "and"
    .replace(/[^a-z0-9]+/g, '_')    // non-alphanumeric → underscore
    .replace(/^_|_$/g, '')           // trim leading/trailing underscores
    .replace(/_+/g, '_')             // collapse consecutive underscores
    .slice(0, 80)                    // max length guard

  return `/media/catalog/${slug}.jpg`
}

/**
 * Category-specific fallback paths — used when no product-level asset is found.
 * Maps to `/media/catalog/fallback_{category}.jpg` which the proxy resolves to a
 * curated Unsplash image.
 */
export const CATEGORY_FALLBACK_ASSET: Record<string, string> = {
  flours:         '/media/catalog/fallback_flours.jpg',
  staples:        '/media/catalog/fallback_staples.jpg',
  rice:           '/media/catalog/fallback_rice.jpg',
  pulses:         '/media/catalog/fallback_pulses.jpg',
  oils:           '/media/catalog/fallback_oils.jpg',
  instant:        '/media/catalog/fallback_instant.jpg',
  spices:         '/media/catalog/fallback_spices.jpg',
  condiments:     '/media/catalog/fallback_condiments.jpg',
  biscuits:       '/media/catalog/fallback_biscuits.jpg',
  snacks:         '/media/catalog/fallback_snacks.jpg',
  beverages:      '/media/catalog/fallback_beverages.jpg',
  'personal-care':'/media/catalog/fallback_personal_care.jpg',
  household:      '/media/catalog/fallback_household.jpg',
  soaps:          '/media/catalog/fallback_soaps.jpg',
  milk:           '/media/catalog/fallback_milk.jpg',
  butter:         '/media/catalog/fallback_butter.jpg',
  curd:           '/media/catalog/fallback_curd.jpg',
  cheese:         '/media/catalog/fallback_cheese.jpg',
  eggs:           '/media/catalog/fallback_eggs.jpg',
  bread:          '/media/catalog/fallback_bread.jpg',
  cakes:          '/media/catalog/fallback_cakes.jpg',
  pastry:         '/media/catalog/fallback_pastry.jpg',
  vegetables:     '/media/catalog/fallback_veggies.jpg',
  leafy:          '/media/catalog/fallback_leafy.jpg',
  fruits:         '/media/catalog/fallback_fruits.jpg',
  premium:        '/media/catalog/fallback_fish.jpg',
  shellfish:      '/media/catalog/fallback_shellfish.jpg',
  freshwater:     '/media/catalog/fallback_fish.jpg',
  dried:          '/media/catalog/fallback_fish.jpg',
  imported:       '/media/catalog/fallback_fish.jpg',
  poultry:        '/media/catalog/fallback_poultry.jpg',
  general:        '/media/catalog/fallback_general.jpg',
}
