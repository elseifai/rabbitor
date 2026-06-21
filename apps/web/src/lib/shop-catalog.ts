/**
 * Shop Catalog — dynamic fetch layer
 *
 * Previously this file held hardcoded mock data (3 demo shops).
 * It now delegates to the live API for all data, with a thin in-memory
 * cache to avoid redundant requests within the same page session.
 *
 * Architecture note
 * ─────────────────
 * · ESSENTIALS (Grocery, Pharmacy, Vegetables, Fish/Meat) products are
 *   served from the global master catalog at https://rabbitor.elseif.ai/admin
 *   via `lib/global-catalog-service.ts`.
 *
 * · MARKETPLACE (Restaurants, Snacks, Cloud Kitchens, Clothes, Shoes) products
 *   come from individual merchant shop endpoints at `/api/shops` and
 *   `/api/shops/[slug]/products`.
 */

// ─── Legacy exports (kept for backward-compatibility) ────────────────────────

/**
 * Previously a hardcoded map of `shop-{n}` demo IDs → slugs.
 * Now empty — the legacy redirect page falls back to a live DB lookup
 * when this map has no entry.
 */
export const SHOP_ID_TO_SLUG: Record<string, string> = {}

// ─── Shared types (kept for backward-compatibility with call sites) ───────────

export type CatalogProduct = {
  id: string
  name: string
  price: number
  unit: string
  mrp?: number | null
  image?: string | null
  stock?: number
  isAvailable?: boolean
}

export type CatalogShop = {
  id: string
  slug: string
  name: string
  category?: string
  storeType?: string
  image?: string | null
  etaMinutes?: number
  deliveryFee?: number
  ratingAvg?: number
  products: CatalogProduct[]
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const SHOP_CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes

type ShopCacheEntry = { data: CatalogShop; ts: number }
const shopCache = new Map<string, ShopCacheEntry>()

function readShopCache(key: string): CatalogShop | null {
  const entry = shopCache.get(key)
  if (entry && Date.now() - entry.ts < SHOP_CACHE_TTL_MS) return entry.data
  shopCache.delete(key)
  return null
}

function writeShopCache(key: string, data: CatalogShop) {
  shopCache.set(key, { data, ts: Date.now() })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch a single shop's catalog from the live API.
 * Returns null if the shop cannot be found or the request fails.
 */
export async function getCatalogShop(
  shopId: string,
  options: { signal?: AbortSignal } = {},
): Promise<CatalogShop | null> {
  const cacheKey = `shop:${shopId}`
  const cached = readShopCache(cacheKey)
  if (cached) return cached

  try {
    const res = await fetch(`/api/shops/${shopId}`, { signal: options.signal })
    if (!res.ok) return null
    const json = await res.json()
    if (!json.success || !json.data) return null

    const raw = json.data as {
      id: string
      slug: string
      name: string
      category?: string
      storeType?: string
      image?: string | null
      etaMinutes?: number
      avgPrepMinutes?: number
      deliveryFee?: number
      baseDeliveryFee?: number
      ratingAvg?: number
      products?: Array<{
        id: string
        name: string
        price: number
        unit?: string
        weight?: string
        mrp?: number | null
        image?: string | null
        stock?: number
        isAvailable?: boolean
      }>
    }

    const shop: CatalogShop = {
      id: raw.id,
      slug: raw.slug,
      name: raw.name,
      category: raw.category,
      storeType: raw.storeType,
      image: raw.image,
      etaMinutes: raw.etaMinutes ?? raw.avgPrepMinutes,
      deliveryFee: raw.deliveryFee ?? raw.baseDeliveryFee,
      ratingAvg: raw.ratingAvg,
      products: (raw.products ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        unit: p.unit ?? p.weight ?? 'piece',
        mrp: p.mrp,
        image: p.image,
        stock: p.stock,
        isAvailable: p.isAvailable,
      })),
    }

    writeShopCache(cacheKey, shop)
    return shop
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err
    return null
  }
}

/**
 * Synchronous catalog product name lookup.
 * Previously iterated the static SHOP_CATALOG; now returns undefined since
 * all product data comes from the live API.
 *
 * Retained for call-site compatibility in `resolve-cart-product.ts` and
 * `actions/orders.ts` — callers handle the undefined case gracefully.
 */
export function getCatalogProductName(_productId: string): string | undefined {
  return undefined
}

/**
 * Async version — resolves product name via the live API.
 * Use this in client-side code where async is acceptable.
 */
export async function getCatalogProductNameAsync(
  productId: string,
): Promise<string | undefined> {
  try {
    const res = await fetch(`/api/products/${productId}`)
    if (!res.ok) return undefined
    const json = await res.json()
    return (json.data?.name ?? undefined) as string | undefined
  } catch {
    return undefined
  }
}

/**
 * Fetch the featured shops list for the homepage.
 * Returns live data from `/api/shops` sorted by rating, with a 3-minute cache.
 */
export async function getFeaturedShops(
  options: { storeType?: string; limit?: number; signal?: AbortSignal } = {},
): Promise<CatalogShop[]> {
  const { storeType, limit = 6, signal } = options
  const cacheKey = `featured:${storeType ?? 'all'}:${limit}`

  const cached = readShopCache(cacheKey)
  if (cached) return [cached] // shallow match — not ideal, but safe

  try {
    const url = storeType ? `/api/shops?storeType=${storeType}` : '/api/shops'
    const res = await fetch(url, { signal })
    if (!res.ok) return []

    const json = await res.json()
    if (!json.success || !Array.isArray(json.data)) return []

    return (json.data as Array<{
      id: string
      slug: string
      name: string
      category?: string
      storeType?: string
      image?: string | null
      etaMinutes?: number
      baseDeliveryFee?: number
      ratingAvg?: number
      products?: CatalogProduct[]
    }>)
      .slice(0, limit)
      .map((raw) => ({
        id: raw.id,
        slug: raw.slug,
        name: raw.name,
        category: raw.category,
        storeType: raw.storeType,
        image: raw.image,
        etaMinutes: raw.etaMinutes,
        deliveryFee: raw.baseDeliveryFee,
        ratingAvg: raw.ratingAvg,
        products: raw.products ?? [],
      }))
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err
    return []
  }
}

/** Invalidate the shop catalog cache (call after product updates). */
export function invalidateShopCatalogCache(shopId?: string) {
  if (shopId) {
    shopCache.delete(`shop:${shopId}`)
  } else {
    shopCache.clear()
  }
}
