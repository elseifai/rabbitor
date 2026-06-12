import type { StoreType } from '@rabbit/database'

// PLATFORM CORE RESOLUTION — CSV / Excel bulk catalog import format
export const ADMIN_CATALOG_HEADERS = [
  'name',
  'storeType',
  'category',
  'basePrice',
  'defaultUnit',
  'description',
  'imageFile',
] as const

export const MERCHANT_PRODUCT_HEADERS = [
  'name',
  'category',
  'price',
  'unit',
  'stock',
  'description',
  'imageFile',
] as const

export type AdminCatalogRow = {
  name: string
  storeType: StoreType
  category: string
  basePrice: number
  defaultUnit: string
  description: string
  imageFile: string
}

export type MerchantProductRow = {
  name: string
  category: string
  price: number
  unit: string
  stock: number
  description: string
  imageFile: string
}

const STORE_TYPES: StoreType[] = [
  'KIRANA', 'FISH', 'VEGETABLE', 'PHARMACY', 'BAKERY', 'DAIRY', 'MEAT', 'GENERAL',
]

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '')
}

export function parseCsvText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map(normalizeHeader)
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    if (cells.every((c) => !c)) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? ''
    })
    rows.push(row)
  }
  return rows
}

export async function parseSpreadsheetFile(file: File): Promise<Record<string, string>[]> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.csv')) {
    const text = await file.text()
    return parseCsvText(text)
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })
    return json.map((row) => {
      const normalized: Record<string, string> = {}
      for (const [k, v] of Object.entries(row)) {
        normalized[normalizeHeader(k)] = String(v ?? '').trim()
      }
      return normalized
    })
  }

  throw new Error('Unsupported file. Use .csv or .xlsx')
}

export function toAdminCatalogRows(raw: Record<string, string>[]): { rows: AdminCatalogRow[]; errors: string[] } {
  const rows: AdminCatalogRow[] = []
  const errors: string[] = []

  raw.forEach((r, i) => {
    const name = r.name?.trim()
    const basePrice = parseFloat(r.baseprice ?? r.base_price ?? '')
    if (!name) {
      errors.push(`Row ${i + 2}: name is required`)
      return
    }
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      errors.push(`Row ${i + 2}: invalid basePrice`)
      return
    }
    const storeType = (r.storetype ?? r.store_type ?? 'GENERAL').toUpperCase() as StoreType
    if (!STORE_TYPES.includes(storeType)) {
      errors.push(`Row ${i + 2}: invalid storeType "${storeType}"`)
      return
    }
    rows.push({
      name,
      storeType,
      category: (r.category ?? 'general').trim() || 'general',
      basePrice,
      defaultUnit: (r.defaultunit ?? r.default_unit ?? 'piece').trim() || 'piece',
      description: (r.description ?? '').trim(),
      imageFile: (r.imagefile ?? r.image_file ?? r.image ?? '').trim(),
    })
  })

  return { rows, errors }
}

export function toMerchantProductRows(raw: Record<string, string>[]): { rows: MerchantProductRow[]; errors: string[] } {
  const rows: MerchantProductRow[] = []
  const errors: string[] = []

  raw.forEach((r, i) => {
    const name = r.name?.trim()
    const price = parseFloat(r.price ?? '')
    if (!name) {
      errors.push(`Row ${i + 2}: name is required`)
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(`Row ${i + 2}: invalid price`)
      return
    }
    const stock = parseInt(r.stock ?? '10', 10)
    rows.push({
      name,
      category: (r.category ?? 'custom').trim() || 'custom',
      price,
      unit: (r.unit ?? '1 piece').trim() || '1 piece',
      stock: Number.isFinite(stock) ? stock : 10,
      description: (r.description ?? '').trim(),
      imageFile: (r.imagefile ?? r.image_file ?? r.image ?? '').trim(),
    })
  })

  return { rows, errors }
}

export function downloadCsvTemplate(headers: readonly string[], filename: string) {
  const sample = headers.join(',')
  const blob = new Blob([`${sample}\n`], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function buildImageFileMap(files: FileList | File[]): Map<string, File> {
  const map = new Map<string, File>()
  for (const file of Array.from(files)) {
    map.set(file.name.toLowerCase(), file)
    map.set(file.name, file)
  }
  return map
}

export function resolveImageFile(imageFile: string, map: Map<string, File>): File | undefined {
  if (!imageFile) return undefined
  return map.get(imageFile) ?? map.get(imageFile.toLowerCase())
}
