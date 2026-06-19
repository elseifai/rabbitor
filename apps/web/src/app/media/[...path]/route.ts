import { readFile, stat } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { getUploadRoot } from '@/lib/media-storage'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

/** Serve uploaded media from the Docker volume / UPLOAD_DIR (runtime files are not in the Next build). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params
  const filename = segments.join('/')

  if (!filename || filename.includes('..') || filename.startsWith('/')) {
    return new NextResponse('Not found', { status: 404 })
  }

  const filePath = path.join(getUploadRoot(), filename)

  try {
    const info = await stat(filePath)
    if (!info.isFile()) {
      return new NextResponse('Not found', { status: 404 })
    }

    const buffer = await readFile(filePath)
    const ext = path.extname(filename).toLowerCase()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
