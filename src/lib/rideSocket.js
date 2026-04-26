import { io } from 'socket.io-client'
import { getSessionRiderToken } from '@/lib/sessionTokens'

/** Match `vercel.json` API host when the SPA is on `*.vercel.app` and env is empty. */
const DEFAULT_PROD_API_HOST = 'https://nodeteam.site'

/**
 * Origin for Socket.IO (HTTP API may use Vercel rewrites while WS must hit the Node host).
 */
export function resolveSocketBaseUrl() {
  const fromEnv = String(import.meta.env.VITE_SOCKET_ORIGIN || import.meta.env.VITE_API_ORIGIN || '')
    .trim()
    .replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (import.meta.env.DEV) return ''
  if (typeof window !== 'undefined' && /\.vercel\.app$/i.test(window.location.hostname)) {
    return DEFAULT_PROD_API_HOST
  }
  return typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : ''
}

/**
 * @param {object} opts
 * @param {string|number} opts.rideId
 * @param {(loc: { lat: number, lng: number }) => void} opts.onDriverLocation
 * @param {() => void} [opts.onConnected]
 * @param {(err: Error) => void} [opts.onError]
 * @returns {() => void} disconnect
 */
export function connectRideTrackingSocket({ rideId, onDriverLocation, onConnected, onError }) {
  const base = resolveSocketBaseUrl()
  const id = parseInt(String(rideId), 10)
  if (!Number.isFinite(id)) {
    return () => {}
  }

  const token = getSessionRiderToken()
  const socket = io(base || undefined, {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 8,
    reconnectionDelay: 1200,
    timeout: 20000,
    ...(token ? { auth: { token }, query: { token } } : {}),
  })

  const onLoc = (payload) => {
    if (payload == null) return
    const rid = payload.rideRequestId ?? payload.rideId
    if (rid != null && Number(rid) !== id) return
    const lat = Number(payload.latitude ?? payload.lat)
    const lng = Number(payload.longitude ?? payload.lng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) onDriverLocation({ lat, lng })
  }

  socket.on('connect', () => {
    socket.emit('subscribe-ride', id)
    onConnected?.()
  })
  socket.on('driver-location-for-ride', onLoc)
  socket.on('connect_error', (e) => onError?.(e))

  return () => {
    socket.off('driver-location-for-ride', onLoc)
    socket.removeAllListeners()
    socket.disconnect()
  }
}
