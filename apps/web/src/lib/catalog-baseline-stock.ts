/** Extract master catalog UUID from wizard template id (`db-{uuid}` or raw uuid). */
export function parseMasterCatalogItemId(catalogId: string): string | null {
  const trimmed = catalogId.trim()
  if (trimmed.startsWith('db-')) return trimmed.slice(3) || null
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed
  }
  return null
}

const BASELINE_STOCK_RE = /Baseline stock template:\s*(\d+)\s*units\./i

/** Parse seeded baseline stock from master catalog description; fallback 20. */
export function parseBaselineStockFromDescription(description: string, fallback = 20): number {
  const match = description.match(BASELINE_STOCK_RE)
  if (!match?.[1]) return fallback
  const value = parseInt(match[1], 10)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}
