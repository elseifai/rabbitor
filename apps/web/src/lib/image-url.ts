const PRODUCT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?w=400&q=80'

/** Normalize stored image paths for browser `<img src>`. */
export function resolveImageSrc(
  src?: string | null,
  fallback = PRODUCT_PLACEHOLDER,
): string {
  const trimmed = src?.trim()
  if (!trimmed) return fallback
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/media/') ||
    trimmed.startsWith('data:image/')
  ) {
    return trimmed
  }
  if (trimmed.startsWith('media/')) return `/${trimmed}`
  return trimmed.startsWith('/') ? trimmed : fallback
}

export function hasImageSrc(src?: string | null): boolean {
  return Boolean(src?.trim())
}
