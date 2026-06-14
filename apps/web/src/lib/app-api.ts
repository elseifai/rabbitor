/**
 * Resolve Next.js BFF routes on the current app origin.
 * Never hardcode localhost or external API ports for web checkout/auth calls.
 */
export function resolveAppApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`

  if (typeof window !== 'undefined') {
    return normalized
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.PUBLIC_APP_URL ??
    ''

  if (!base) return normalized
  return `${base.replace(/\/$/, '')}${normalized}`
}
