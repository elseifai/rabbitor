/** Clear stale service workers and HTTP caches that break Webpack chunks after dev rebuilds. */
export async function clearStaleClientCaches(): Promise<void> {
  if (typeof window === 'undefined') return

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  }

  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }
}
