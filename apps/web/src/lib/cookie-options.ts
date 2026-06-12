/** DEV SANDBOX REFACTOR — HTTP VPS cannot use Secure cookies; HTTPS production should. */
export function useSecureSessionCookies(): boolean {
  if (process.env.COOKIE_SECURE === 'false') return false
  if (process.env.COOKIE_SECURE === 'true') return true

  const appUrl =
    process.env.PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    ''

  if (appUrl.startsWith('https://')) return true
  if (appUrl.startsWith('http://')) return false

  return false
}
