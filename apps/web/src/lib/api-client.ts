import { getApiBaseUrl, mintApiAccessToken } from './api-jwt'

type ApiFetchOptions = {
  method?: string
  body?: unknown
  searchParams?: Record<string, string | number | undefined>
}

export async function fetchFromApi<T>(
  userId: string,
  path: string,
  options: ApiFetchOptions = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const token = await mintApiAccessToken(userId)
  const url = new URL(`${getApiBaseUrl()}${path}`)

  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  })

  const json = await response.json().catch(() => ({}))

  if (!response.ok || json.success === false) {
    const err = json.error
    const message =
      typeof err === 'string'
        ? err
        : typeof err === 'object' && err && 'message' in err
          ? String((err as { message: string }).message)
          : 'Request failed'
    return { ok: false, status: response.status, error: message }
  }

  return { ok: true, data: json.data as T }
}
