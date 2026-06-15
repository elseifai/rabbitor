import type { StoreType, CatalogItemType } from '@rabbit/database'
import { parseCatalogItemType } from '@/lib/catalog-performance'

export type CatalogCsvRow = {
  sku: string
  name: string
  category: string
  subcategory: string | null
  basePrice: number
  description: string | null
  imageUrl: string | null
  storeType: StoreType
  defaultUnit: string
  itemType: CatalogItemType
}

export type CatalogParseResult = {
  rows: CatalogCsvRow[]
  errors: string[]
  skipped: number
}

const STORE_TYPES = new Set([
  'KIRANA', 'FISH', 'VEGETABLE', 'PHARMACY', 'BAKERY', 'DAIRY', 'MEAT', 'GENERAL',
])

function parseLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

function headerIndex(header: string[], ...names: string[]): number {
  for (const name of names) {
    const i = header.indexOf(name)
    if (i >= 0) return i
  }
  return -1
}

export function parseMasterCatalogCsv(text: string): CatalogParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const errors: string[] = []
  const rows: CatalogCsvRow[] = []
  let skipped = 0

  if (lines.length === 0) {
    return { rows, errors: ['CSV is empty'], skipped: 0 }
  }

  const header = parseLine(lines[0]!).map((h) => h.toLowerCase().replace(/\s+/g, '_'))

  const skuI = headerIndex(header, 'sku', 'barcode')
  const nameI = headerIndex(header, 'name', 'product_name', 'title')
  const catI = headerIndex(header, 'category')
  const subI = headerIndex(header, 'subcategory', 'sub_category')
  const priceI = headerIndex(header, 'base_price', 'baseprice', 'price')
  const descI = headerIndex(header, 'description', 'desc')
  const imgI = headerIndex(header, 'image', 'imageurl', 'image_url')
  const storeTypeI = headerIndex(header, 'storetype', 'store_type')
  const unitI = headerIndex(header, 'unit', 'default_unit')
  const typeI = headerIndex(header, 'type', 'item_type', 'itemtype')

  if (nameI < 0 || priceI < 0) {
    return {
      rows,
      errors: ['CSV must include name and base_price (or price) columns'],
      skipped: 0,
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]!)
    const name = cols[nameI]?.trim()
    const priceRaw = cols[priceI]?.replace(/[^\d.]/g, '')
    const basePrice = Number(priceRaw)

    if (!name || !Number.isFinite(basePrice) || basePrice <= 0) {
      skipped++
      errors.push(`Row ${i + 1}: invalid name or base_price`)
      continue
    }

    const sku =
      skuI >= 0 && cols[skuI]?.trim()
        ? cols[skuI]!.trim().toUpperCase()
        : `SKU-${name.slice(0, 8).toUpperCase().replace(/\W/g, '')}-${i}`

    const storeTypeRaw = (storeTypeI >= 0 ? cols[storeTypeI] : 'GENERAL')?.toUpperCase() ?? 'GENERAL'
    const storeType = (STORE_TYPES.has(storeTypeRaw) ? storeTypeRaw : 'GENERAL') as StoreType
    const itemType = parseCatalogItemType(typeI >= 0 ? cols[typeI] : 'VEG')

    rows.push({
      sku,
      name,
      category: catI >= 0 ? cols[catI]?.trim() || 'general' : 'general',
      subcategory: subI >= 0 ? cols[subI]?.trim() || null : null,
      basePrice,
      description: descI >= 0 ? cols[descI]?.trim() || null : null,
      imageUrl: imgI >= 0 ? cols[imgI]?.trim() || null : null,
      storeType,
      defaultUnit: unitI >= 0 ? cols[unitI]?.trim() || 'piece' : 'piece',
      itemType,
    })
  }

  return { rows, errors, skipped }
}
