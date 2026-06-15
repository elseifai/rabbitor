import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { saveUploadedImage } from '@/lib/media-storage'

/** Native binary upload — stores file on VPS media volume, returns public URL path. */
export async function POST(request: Request) {
  try {
    await requireSession(['ADMIN', 'VENDOR', 'RABBITOR', 'CUSTOMER'])

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, error: 'Image file required' }, { status: 400 })
    }

    const saved = await saveUploadedImage(file)

    return NextResponse.json({
      success: true,
      data: { url: saved.url, filename: saved.filename },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    const code = /log in|access denied/i.test(message) ? 401 : 400
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
