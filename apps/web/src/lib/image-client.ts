/** Resize and compress a photo for server-action upload (keeps payload under Next.js body limit). */
export async function compressImageFile(
  file: File,
  maxWidth = 800,
  maxBytes = 400_000,
): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Could not process image')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let quality = 0.85
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrl.length > maxBytes && quality > 0.35) {
    quality -= 0.1
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }

  if (dataUrl.length > maxBytes) {
    throw new Error('Image is too large. Try a smaller photo.')
  }

  return dataUrl
}
