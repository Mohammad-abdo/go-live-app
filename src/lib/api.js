import axios from 'axios'
import { getActiveRole, getSessionDriverToken, getSessionRiderToken } from '@/lib/sessionTokens'

/** Empty string = same-origin in dev (Vite proxies `/apimobile` and `/api`). Production: set `VITE_API_ORIGIN`. */
const origin = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '')

export const api = axios.create({
  baseURL: origin,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
})

function getExistingAuthorization(config) {
  const h = config.headers
  if (!h) return ''
  if (typeof h.get === 'function') return h.get('Authorization') || ''
  return h.Authorization || ''
}

/** Attach JWT from login session (skipped for public auth routes and when caller sets Authorization). */
api.interceptors.request.use((config) => {
  const url = String(config.url || '')
  if (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/resend-otp') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password')
  ) {
    return config
  }
  if (getExistingAuthorization(config)) return config

  const role = getActiveRole()
  const token = role === 'driver' ? getSessionDriverToken() : getSessionRiderToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
