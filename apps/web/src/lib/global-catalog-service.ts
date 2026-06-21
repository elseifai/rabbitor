/**
 * Global Catalog Service
 *
 * Fetches Essentials catalog data from the central repository:
 *   https://rabbitor.elseif.ai/admin  (production admin panel)
 *
 * Used for Grocery, Pharmacy, Vegetables, and Fish/Meat.
 * All items are served from the nearest dark store — customers never
 * need to select a specific merchant shop for Essentials.
 */

import { ADMIN_API_BASE } from '@/lib/platform-categories'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GlobalCatalogItem = {
  id: string
  name: string
  category: string
  subCategory?: string
  price: number
  mrp?: number | null
  unit: string
  image: string | null
  description?: string
  inStock: boolean
  brand?: string
  rank?: number
}

export type EssentialsStore = {
  id: string
  name: string
  slug: string
  storeType: string
  distanceKm: number
  etaMinutes: number
  latitude: number
  longitude: number
  isActive: boolean
  availableItemCount: number
  deliveryFee: number
}

export type CatalogFetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: GlobalCatalogItem[] }
  | { status: 'error'; message: string }

// ─── Cache ────────────────────────────────────────────────────────────────────

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

type CacheEntry = { data: GlobalCatalogItem[]; ts: number }
const inMemoryCache = new Map<string, CacheEntry>()

function readCache(key: string): GlobalCatalogItem[] | null {
  const entry = inMemoryCache.get(key)
  if (entry && Date.now() - entry.ts < CATALOG_CACHE_TTL_MS) return entry.data
  inMemoryCache.delete(key)
  return null
}

function writeCache(key: string, data: GlobalCatalogItem[]) {
  inMemoryCache.set(key, { data, ts: Date.now() })
}

// ─── Normalise raw API response ───────────────────────────────────────────────

type RawCatalogItem = Partial<{
  id: string
  name: string
  category: string
  subCategory: string
  price: number
  mrp: number
  unit: string
  weight: string
  imageUrl: string
  image: string
  description: string
  stock: number
  isAvailable: boolean
  brand: string
  rank: number
}>

function normaliseCatalogItem(raw: RawCatalogItem, fallbackCategory: string): GlobalCatalogItem {
  return {
    id: raw.id ?? '',
    name: raw.name ?? 'Unknown',
    category: raw.category ?? fallbackCategory,
    subCategory: raw.subCategory,
    price: raw.price ?? 0,
    mrp: raw.mrp ?? null,
    unit: raw.unit ?? raw.weight ?? 'piece',
    image: raw.imageUrl ?? raw.image ?? null,
    description: raw.description,
    inStock: raw.isAvailable !== false && (raw.stock ?? 1) > 0,
    brand: raw.brand,
    rank: raw.rank,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the master Essentials catalog for a given category from the admin API.
 *
 * Hits: GET https://rabbitor.elseif.ai/api/admin/master-catalog?category=…
 *
 * Falls back gracefully on network errors — callers should handle empty arrays.
 */
export async function fetchEssentialsCatalog(
  category: string,
  options: { signal?: AbortSignal; limit?: number } = {},
): Promise<GlobalCatalogItem[]> {
  const { signal, limit = 40 } = options
  const cacheKey = `catalog:${category}:${limit}`

  const cached = readCache(cacheKey)
  if (cached) return cached

  try {
    const url = new URL(`${ADMIN_API_BASE}/api/admin/master-catalog`)
    url.searchParams.set('category', category)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('inStock', 'true')

    const res = await fetch(url.toString(), {
      signal,
      next: { revalidate: 300 }, // Next.js fetch cache 5 min
    })

    if (!res.ok) {
      throw new Error(`Master catalog API returned ${res.status}`)
    }

    const json = await res.json()

    // Tolerate both { data: [] } and { items: [] } shapes
    const raw: RawCatalogItem[] = Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.items)
        ? json.items
        : []

    const items = raw
      .filter((r) => r.id && r.name)
      .map((r) => normaliseCatalogItem(r, category))

    writeCache(cacheKey, items)
    return items
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err
    // Silently degrade — UI will show fallback state
    return []
  }
}

/**
 * Fetch all Essentials categories in parallel.
 * Returns a map of category → items.
 */
export async function fetchAllEssentialsCatalog(
  categories: readonly string[],
  options: { signal?: AbortSignal } = {},
): Promise<Record<string, GlobalCatalogItem[]>> {
  const entries = await Promise.all(
    categories.map(async (cat) => {
      const items = await fetchEssentialsCatalog(cat, options)
      return [cat, items] as const
    }),
  )
  return Object.fromEntries(entries)
}

/**
 * Fetch Essentials-capable stores near a given coordinate.
 *
 * Hits: GET https://rabbitor.elseif.ai/api/shops?model=ESSENTIALS&lat=…&lng=…
 *
 * Falls back to empty array on failure.
 */
export async function fetchEssentialsStores(
  lat: number,
  lng: number,
  options: { signal?: AbortSignal; radiusKm?: number } = {},
): Promise<EssentialsStore[]> {
  const { signal, radiusKm = 15 } = options
  const cacheKey = `stores:${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusKm}`

  const cached = readCache(cacheKey) as unknown as EssentialsStore[] | null
  if (cached) return cached

  try {
    const url = new URL(`${ADMIN_API_BASE}/api/shops`)
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lng', String(lng))
    url.searchParams.set('model', 'ESSENTIALS')
    url.searchParams.set('radiusKm', String(radiusKm))
    url.searchParams.set('openOnly', 'true')

    const res = await fetch(url.toString(), { signal })
    if (!res.ok) throw new Error(`Stores API returned ${res.status}`)

    const json = await res.json()
    const raw: Array<Partial<EssentialsStore>> = Array.isArray(json.data) ? json.data : []

    const stores: EssentialsStore[] = raw
      .filter((s) => s.id && s.name)
      .map((s) => ({
        id: s.id ?? '',
        name: s.name ?? '',
        slug: s.slug ?? '',
        storeType: s.storeType ?? 'KIRANA',
        distanceKm: s.distanceKm ?? 0,
        etaMinutes: s.etaMinutes ?? 15,
        latitude: s.latitude ?? 0,
        longitude: s.longitude ?? 0,
        isActive: s.isActive ?? true,
        availableItemCount: s.availableItemCount ?? 0,
        deliveryFee: s.deliveryFee ?? 20,
      }))

    // Store entries need different cache mechanism (not GlobalCatalogItem[])
    // so we cast here as a workaround for the shared cache type
    inMemoryCache.set(cacheKey, { data: stores as unknown as GlobalCatalogItem[], ts: Date.now() })
    return stores
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err
    return []
  }
}

/**
 * Clear all catalog caches (useful after add-to-cart or after long idle).
 */
export function clearCatalogCache() {
  inMemoryCache.clear()
}
