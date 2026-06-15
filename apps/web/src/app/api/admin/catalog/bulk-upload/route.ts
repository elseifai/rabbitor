import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { parseMasterCatalogCsv } from '@/lib/master-catalog-csv'
import { bulkUpsertMasterCatalog } from '@/lib/master-catalog-metrics'

/** Bulk CSV import: sku, name, category, subcategory, base_price, description, type */
export async function POST(request: Request) {
  try {
    await requireSession(['ADMIN'])

    const contentType = request.headers.get('content-type') ?? ''
    let csvText = ''

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file')
      if (!(file instanceof File)) {
        return NextResponse.json({ success: false, error: 'CSV file required' }, { status: 400 })
      }
      csvText = await file.text()
    } else {
      csvText = await request.text()
    }

    const parsed = parseMasterCatalogCsv(csvText)
    if (parsed.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.errors[0] ?? 'No valid rows',
          errors: parsed.errors,
          lineErrors: parsed.errors,
        },
        { status: 400 },
      )
    }

    const upserted = await bulkUpsertMasterCatalog(parsed.rows)

    return NextResponse.json({
      success: true,
      upserted,
      skipped: parsed.skipped,
      errors: parsed.errors.slice(0, 50),
      lineErrors: parsed.errors.slice(0, 50),
      totalRows: parsed.rows.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
