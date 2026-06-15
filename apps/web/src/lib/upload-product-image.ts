import { compressImageFile } from '@/lib/image-client'

/** Upload image via native /api/upload; falls back to compressed data URL offline. */
export async function uploadProductImage(file: File): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
    const json = await res.json()
    if (json.success && json.data?.url) {
      return String(json.data.url)
    }
  } catch {
    /* fall through */
  }

  return compressImageFile(file)
}
