import axios from 'axios'
import { normalizeEnvOrigin } from '@/lib/envOrigin'
import { getActiveRole, getSessionDriverToken, getSessionRiderToken } from '@/lib/sessionTokens'

/**
 * API base URL (no trailing slash).
 * - **Dev / `vite preview`:** leave empty → same origin → Vite `server.proxy` / `preview.proxy` → `VITE_API_PROXY_TARGET` or `VITE_API_ORIGIN`.
 * - **Production (static host ≠ API):** set `VITE_API_ORIGIN=https://nodeteam.site` at **build** time (single origin; do not paste two URLs separated by commas).
 * Note: `https://nodeteam.site/` (site root) may return **404**; routes live under `/apimobile` and `/api`.
 */
const origin = normalizeEnvOrigin(import.meta.env.VITE_API_ORIGIN)

if (import.meta.env.DEV && !origin) {
  console.info('[go-live-tester] VITE_API_ORIGIN empty — same-origin /apimobile (Vite proxy).')
}

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

/**
 * Pick JWT for this request. User routes must always use the rider token;
 * driver routes the driver token — otherwise `/apimobile/user/*` gets a
 * driver JWT and the API responds 401.
 */
function bearerForRequestUrl(url) {
  const u = String(url || '')
  if (u.includes('/apimobile/driver/')) return getSessionDriverToken()
  if (u.includes('/apimobile/user/')) return getSessionRiderToken()
  if (u.includes('/apimobile/chat/')) {
    return getActiveRole() === 'driver' ? getSessionDriverToken() : getSessionRiderToken()
  }
  return getActiveRole() === 'driver' ? getSessionDriverToken() : getSessionRiderToken()
}

/** Attach JWT from login session (skipped for public auth routes and when caller sets Authorization). */
api.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const h = config.headers
    if (h && typeof h.delete === 'function') h.delete('Content-Type')
    else if (h) delete h['Content-Type']
  }

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

  const token = bearerForRequestUrl(url)
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
