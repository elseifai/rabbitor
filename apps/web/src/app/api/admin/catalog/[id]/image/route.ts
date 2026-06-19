import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

/**
 * POST /api/admin/catalog/:id/image
 * Body: multipart form-data  →  file (image) OR JSON { imageUrl: string }
 * Updates MasterCatalogItem.imageUrl and propagates to all linked shop products.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession(['ADMIN'])
    const { id } = await params

    const item = await prisma.masterCatalogItem.findUnique({
      where: { id },
      select: { id: true, name: true },
    })
    if (!item) {
      return NextResponse.json({ success: false, error: 'Catalog item not found' }, { status: 404 })
    }

    let imageUrl: string | null = null

    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      // File upload — read as data URL (stored directly in DB for now)
      const form = await request.formData()
      const file = form.get('file') as File | null
      if (!file || !file.type.startsWith('image/')) {
        return NextResponse.json({ success: false, error: 'Invalid image file' }, { status: 400 })
      }
      if (file.size > 2_000_000) {
        return NextResponse.json({ success: false, error: 'Image must be under 2 MB' }, { status: 400 })
      }
      const buf = Buffer.from(await file.arrayBuffer())
      imageUrl = `data:${file.type};base64,${buf.toString('base64')}`
    } else {
      // JSON body with imageUrl
      const body = (await request.json()) as { imageUrl?: string }
      if (!body.imageUrl?.startsWith('http')) {
        return NextResponse.json({ success: false, error: 'Provide a valid https:// image URL' }, { status: 400 })
      }
      imageUrl = body.imageUrl.trim()
    }

    // Update MasterCatalogItem
    await prisma.masterCatalogItem.update({
      where: { id },
      data: { imageUrl },
    })

    // Propagate to all linked shop products that still have no custom image
    const propagated = await prisma.product.updateMany({
      where: {
        masterCatalogItemId: id,
        OR: [{ image: null }, { image: '' }],
      },
      data: { image: imageUrl },
    })

    return NextResponse.json({
      success: true,
      data: { id, imageUrl, propagatedToProducts: propagated.count },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
