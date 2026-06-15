import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 5 * 1024 * 1024

export function getUploadRoot(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'media')
}

export function getPublicMediaUrl(filename: string): string {
  return `/media/${filename}`
}

export async function saveUploadedImage(file: File): Promise<{ url: string; filename: string }> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error('Only JPEG, PNG, WebP, or GIF images are allowed')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be 5 MB or smaller')
  }

  const ext = mimeToExt(file.type)
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`
  const root = getUploadRoot()
  await mkdir(root, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(root, filename), buffer)

  return { url: getPublicMediaUrl(filename), filename }
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    case 'image/gif':
      return '.gif'
    default:
      return '.bin'
  }
}
