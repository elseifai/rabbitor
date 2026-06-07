import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import Constants from 'expo-constants'
import { clearToken, getToken } from './auth'

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined
const baseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  extra?.apiUrl ??
  'http://localhost:4000'

export const api = axios.create({
  baseURL: `${baseURL.replace(/\/$/, '')}/api/v1`,
  timeout: 20000,
})

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await clearToken()
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  },
)

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string | { message?: string } } | undefined
    if (typeof data?.error === 'string') return data.error
    if (typeof data?.error === 'object' && data.error?.message) return data.error.message
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong'
}

export function getSocketUrl(): string {
  const extraConfig = Constants.expoConfig?.extra as { socketUrl?: string; apiUrl?: string } | undefined
  return (extraConfig?.socketUrl ?? baseURL).replace(/\/$/, '')
}
