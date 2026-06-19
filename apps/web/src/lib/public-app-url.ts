/**
 * Canonical public origin for server-side redirects (OAuth, email links).
 * Prefer runtime PUBLIC_APP_URL — NEXT_PUBLIC_* is baked at build and may be localhost.
 * When behind a reverse proxy, forwarded host wins over a localhost env default.
 */
export function getPublicAppOrigin(request?: Request): string {
  if (request) {
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'https'
    if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.startsWith('127.')) {
      return `${forwardedProto}://${forwardedHost}`
    }
    const host = request.headers.get('host')
    if (host && !host.includes('localhost') && !host.startsWith('127.')) {
      const proto = request.headers.get('x-forwarded-proto') ?? 'https'
      return `${proto}://${host}`
    }
  }

  const fromEnv = process.env.PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv?.trim() && !fromEnv.includes('localhost') && !fromEnv.startsWith('http://127.')) {
    return fromEnv.trim().replace(/\/$/, '')
  }

  if (fromEnv?.trim()) {
    return fromEnv.trim().replace(/\/$/, '')
  }

  return 'http://localhost:3000'
}

export function publicAppUrl(path: string, request?: Request): string {
  const base = getPublicAppOrigin(request)
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}
