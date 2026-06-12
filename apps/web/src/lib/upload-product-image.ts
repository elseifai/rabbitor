import { compressImageFile } from '@/lib/image-client'

// PLATFORM CORE RESOLUTION — browse-to-upload helper (API first, data-URL fallback)
export async function uploadProductImage(file: File): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('image', file)

    const res = await fetch('/api/products/upload-image', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
    const json = await res.json()
    if (json.success && json.data?.url) {
      return String(json.data.url)
    }
  } catch {
    /* fall through to compressed data URL */
  }

  return compressImageFile(file)
}
