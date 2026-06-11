import { REDIS_KEYS, SHOP_PRODUCT_CACHE_TTL_SECONDS } from "@rabbit/shared";
import { getRedis } from "./redis";

export const PRODUCT_CACHE_ALL_CATEGORY = "all";

export function normalizeProductCategory(category?: string | null): string {
  const trimmed = category?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : PRODUCT_CACHE_ALL_CATEGORY;
}

export function shopCategoryCacheKey(shopId: string, category: string): string {
  return REDIS_KEYS.shopCategoryProducts(shopId, normalizeProductCategory(category));
}

export async function getCachedShopProducts<T>(cacheKey: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const raw = await redis.get(cacheKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCachedShopProducts<T>(cacheKey: string, payload: T): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(
      cacheKey,
      JSON.stringify(payload),
      "EX",
      SHOP_PRODUCT_CACHE_TTL_SECONDS,
    );
  } catch {
    /* Non-fatal: serve fresh DB payload even if cache write fails */
  }
}

/**
 * Deletes one or more category cache keys for a shop.
 * Always includes the aggregate `all` bucket unless it is already listed.
 */
export async function invalidateShopProductCaches(
  shopId: string,
  categories: Array<string | null | undefined> = [],
): Promise<void> {
  try {
    const redis = getRedis();
    const keys = new Set<string>();

    keys.add(shopCategoryCacheKey(shopId, PRODUCT_CACHE_ALL_CATEGORY));
    for (const category of categories) {
      keys.add(shopCategoryCacheKey(shopId, normalizeProductCategory(category)));
    }

    const keyList = Array.from(keys);
    if (keyList.length > 0) {
      await redis.del(...keyList);
    }
  } catch {
    /* Cache invalidation failure must not block catalog writes */
  }
}

/** Clears every cached category feed for a shop (e.g. after bulk stock mutations). */
export async function invalidateAllShopProductCaches(shopId: string): Promise<void> {
  try {
    const redis = getRedis();
    const pattern = `shop:${shopId}:category:*`;
    let cursor = "0";

    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    /* Non-fatal */
  }
}
