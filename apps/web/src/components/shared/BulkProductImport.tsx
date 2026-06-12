'use client'

import { useRef, useState } from 'react'
import { Download, FileSpreadsheet, ImageIcon, Loader2, Upload } from 'lucide-react'
import {
  ADMIN_CATALOG_HEADERS,
  MERCHANT_PRODUCT_HEADERS,
  buildImageFileMap,
  downloadCsvTemplate,
  parseSpreadsheetFile,
  resolveImageFile,
  toAdminCatalogRows,
  toMerchantProductRows,
  type AdminCatalogRow,
  type MerchantProductRow,
} from '@/lib/catalog-import'
import { uploadProductImage } from '@/lib/upload-product-image'

// PLATFORM CORE RESOLUTION — CSV/Excel bulk import with manual image matching
export function BulkProductImport({
  mode,
  shopId,
  onComplete,
}: {
  mode: 'admin' | 'merchant'
  shopId?: string
  onComplete: () => void
}) {
  const sheetRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<HTMLInputElement>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [sheetName, setSheetName] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const headers = mode === 'admin' ? ADMIN_CATALOG_HEADERS : MERCHANT_PRODUCT_HEADERS

  const runImport = async () => {
    const sheetFile = sheetRef.current?.files?.[0]
    if (!sheetFile) {
      setError('Select a CSV or Excel file first')
      return
    }
    if (mode === 'merchant' && !shopId) {
      setError('Shop not loaded')
      return
    }

    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const raw = await parseSpreadsheetFile(sheetFile)
      const imageMap = buildImageFileMap(imageFiles)

      if (mode === 'admin') {
        const { rows, errors } = toAdminCatalogRows(raw)
        if (errors.length) {
          setError(errors.slice(0, 5).join('\n'))
          return
        }
        if (!rows.length) {
          setError('No valid rows found')
          return
        }

        const payload = await resolveRowsWithImages(rows, imageMap, setProgress)
        const res = await fetch('/api/admin/master-catalog/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: payload }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error ?? 'Bulk import failed')
        setResult(`Imported ${json.count} catalog items`)
      } else {
        const { rows, errors } = toMerchantProductRows(raw)
        if (errors.length) {
          setError(errors.slice(0, 5).join('\n'))
          return
        }
        if (!rows.length) {
          setError('No valid rows found')
          return
        }

        const payload = await resolveMerchantRowsWithImages(rows, imageMap, setProgress)
        const res = await fetch('/api/merchant/products/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopId, items: payload }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error ?? 'Bulk import failed')
        setResult(`Imported ${json.count} products to your store`)
      }

      onComplete()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
      setProgress('')
    }
  }

  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-dashed border-orange-200 bg-orange-50/20 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-gray-900">Bulk import (CSV / Excel)</h4>
          <p className="mt-1 text-xs text-gray-500">
            Upload a spreadsheet, then attach images. Match rows using the <code className="text-orange-600">imageFile</code> column (e.g. <code className="text-orange-600">maggi.jpg</code>).
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadCsvTemplate(headers, `${mode}-import-template.csv`)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-orange-100 bg-white px-2 py-1 text-[10px] font-bold text-orange-600"
        >
          <Download className="h-3 w-3" />
          Template
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-orange-100 bg-white p-4 text-center hover:bg-orange-50/50">
          <FileSpreadsheet className="mb-2 h-6 w-6 text-orange-500" />
          <span className="text-xs font-semibold text-gray-700">
            {sheetName ?? 'Choose CSV or Excel'}
          </span>
          <input
            ref={sheetRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => setSheetName(e.target.files?.[0]?.name ?? null)}
          />
        </label>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-orange-100 bg-white p-4 text-center hover:bg-orange-50/50">
          <ImageIcon className="mb-2 h-6 w-6 text-orange-500" />
          <span className="text-xs font-semibold text-gray-700">
            {imageFiles.length ? `${imageFiles.length} images selected` : 'Upload product images'}
          </span>
          <input
            ref={imagesRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
          />
        </label>
      </div>

      <p className="text-[10px] text-gray-400">
        Columns: {headers.join(', ')}
      </p>

      {progress && (
        <p className="text-xs text-orange-600">{progress}</p>
      )}
      {error && (
        <p className="whitespace-pre-wrap rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}
      {result && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">{result}</p>
      )}

      <button
        type="button"
        disabled={importing}
        onClick={() => void runImport()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
      >
        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {importing ? 'Importing…' : 'Run bulk import'}
      </button>
    </div>
  )
}

async function resolveRowsWithImages(
  rows: AdminCatalogRow[],
  imageMap: Map<string, File>,
  onProgress: (msg: string) => void,
) {
  const out: {
    name: string
    storeType: AdminCatalogRow['storeType']
    category: string
    basePrice: number
    defaultUnit: string
    description: string
    imageUrl?: string
  }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    onProgress(`Processing ${i + 1}/${rows.length}: ${row.name}`)
    let imageUrl: string | undefined
    const file = resolveImageFile(row.imageFile, imageMap)
    if (file) {
      imageUrl = await uploadProductImage(file)
    }
    out.push({
      name: row.name,
      storeType: row.storeType,
      category: row.category,
      basePrice: row.basePrice,
      defaultUnit: row.defaultUnit,
      description: row.description,
      imageUrl,
    })
  }
  return out
}

async function resolveMerchantRowsWithImages(
  rows: MerchantProductRow[],
  imageMap: Map<string, File>,
  onProgress: (msg: string) => void,
) {
  const out: {
    name: string
    category: string
    price: number
    unit: string
    stock: number
    description: string
    imageUrl?: string
  }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    onProgress(`Processing ${i + 1}/${rows.length}: ${row.name}`)
    let imageUrl: string | undefined
    const file = resolveImageFile(row.imageFile, imageMap)
    if (file) {
      imageUrl = await uploadProductImage(file)
    }
    out.push({
      name: row.name,
      category: row.category,
      price: row.price,
      unit: row.unit,
      stock: row.stock,
      description: row.description,
      imageUrl,
    })
  }
  return out
}
