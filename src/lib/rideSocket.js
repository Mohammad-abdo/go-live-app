import { io } from 'socket.io-client'
import { normalizeEnvOrigin } from '@/lib/envOrigin'
import { getSessionRiderToken } from '@/lib/sessionTokens'

/**
 * Socket.IO must use the **same origin** as the HTML when you proxy `/socket.io` (e.g. Vercel → API).
 * Connecting straight to the API host from another site hits CORS on Engine.IO polling.
 */
export function resolveSocketBaseUrl() {
  const fromEnv = normalizeEnvOrigin(
    import.meta.env.VITE_SOCKET_ORIGIN || import.meta.env.VITE_API_ORIGIN || '',
  )
  if (fromEnv) return fromEnv
  if (import.meta.env.DEV) return ''
  if (typeof window !== 'undefined') return window.location.origin.replace(/\/$/, '')
  return ''
}

/**
 * @param {object} opts
 * @param {string|number} opts.rideId
 * @param {(loc: { lat: number, lng: number }) => void} opts.onDriverLocation
 * @param {() => void} [opts.onConnected]
 * @param {(err: Error) => void} [opts.onError]
 * @param {(payload: object) => void} [opts.onTripCompleted]
 * @param {(payload: object) => void} [opts.onTripCancelled]
 * @returns {() => void} disconnect
 */
export function connectRideTrackingSocket({
  rideId,
  onDriverLocation,
  onConnected,
  onError,
  onTripCompleted,
  onTripCancelled,
}) {
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
    ...(token ? { auth: { token } } : {}),
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
  const onCompleted = (payload) => {
    const rid = payload?.rideRequestId ?? payload?.rideId
    if (rid != null && Number(rid) !== id) return
    onTripCompleted?.(payload)
  }
  const onCancelled = (payload) => {
    const rid = payload?.rideRequestId ?? payload?.rideId
    if (rid != null && Number(rid) !== id) return
    onTripCancelled?.(payload)
  }

  socket.on('driver-location-for-ride', onLoc)
  socket.on('trip-completed', onCompleted)
  socket.on('trip-cancelled', onCancelled)
  socket.on('connect_error', (e) => onError?.(e))

  return () => {
    socket.off('driver-location-for-ride', onLoc)
    socket.off('trip-completed', onCompleted)
    socket.off('trip-cancelled', onCancelled)
    socket.removeAllListeners()
    socket.disconnect()
  }
}

/**
 * Rider-only: join `user-{id}` to receive `rider-ride-assigned`, `rider-trip-completed`, `rider-trip-cancelled`.
 * @param {object} opts
 * @param {number} opts.userId
 * @param {(payload: { rideRequestId?: number, status?: string, driverId?: number, proposedFare?: number }) => void} [opts.onRideAssigned]
 * @param {(payload: { rideRequestId?: number }) => void} [opts.onTripCompleted]
 * @param {(payload: { rideRequestId?: number, reason?: string | null }) => void} [opts.onTripCancelled]
 * @returns {() => void}
 */
export function connectRiderUserSocket({ userId, onRideAssigned, onTripCompleted, onTripCancelled }) {
  const base = resolveSocketBaseUrl()
  const token = getSessionRiderToken()
  if (!userId || !token) {
    return () => {}
  }

  const socket = io(base || undefined, {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
    timeout: 20000,
    auth: { token },
  })

  const onAssigned = (payload) => onRideAssigned?.(payload)
  const onDone = (payload) => onTripCompleted?.(payload)
  const onCancel = (payload) => onTripCancelled?.(payload)

  socket.on('connect', () => {
    socket.emit('join-user-room', userId)
  })
  socket.on('rider-ride-assigned', onAssigned)
  socket.on('rider-trip-completed', onDone)
  socket.on('rider-trip-cancelled', onCancel)

  return () => {
    socket.off('rider-ride-assigned', onAssigned)
    socket.off('rider-trip-completed', onDone)
    socket.off('rider-trip-cancelled', onCancel)
    socket.removeAllListeners()
    socket.disconnect()
  }
}
