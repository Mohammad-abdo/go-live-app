import { io } from 'socket.io-client'
import { normalizeEnvOrigin } from '@/lib/envOrigin'
import { getActiveRole, getSessionDriverToken, getSessionRiderToken } from '@/lib/sessionTokens'

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
 * Ride chat: join `ride-{id}` (same as ActiveTrip) and receive `chat:message` / typing / read from server + REST.
 * @param {object} opts
 * @param {string|number} opts.rideId
 * @param {(msg: object) => void} [opts.onChatMessage]
 * @param {(payload: object) => void} [opts.onChatTyping]
 * @param {(payload: object) => void} [opts.onChatRead]
 * @param {(err: Error) => void} [opts.onError]
 * @returns {() => void}
 */
export function connectRideChatSocket({ rideId, onChatMessage, onChatTyping, onChatRead, onError }) {
  const base = resolveSocketBaseUrl()
  const id = parseInt(String(rideId), 10)
  if (!Number.isFinite(id)) {
    return () => {}
  }

  const token = getActiveRole() === 'driver' ? getSessionDriverToken() : getSessionRiderToken()
  const socket = io(base || undefined, {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 8,
    reconnectionDelay: 1200,
    timeout: 20000,
    ...(token ? { auth: { token } } : {}),
  })

  const onMsg = (payload) => onChatMessage?.(payload)
  const onTyping = (payload) => onChatTyping?.(payload)
  const onRead = (payload) => onChatRead?.(payload)

  socket.on('connect', () => {
    socket.emit('subscribe-ride', id)
  })
  socket.on('chat:message', onMsg)
  socket.on('chat:typing', onTyping)
  socket.on('chat:read', onRead)
  socket.on('connect_error', (e) => onError?.(e))

  return () => {
    socket.off('chat:message', onMsg)
    socket.off('chat:typing', onTyping)
    socket.off('chat:read', onRead)
    socket.removeAllListeners()
    socket.disconnect()
  }
}

/**
 * Captain home: join `driver-{id}` and refresh when a rider cancels a still-pending booking (no assignee).
 * @param {object} opts
 * @param {number} opts.driverId
 * @param {(payload: { rideRequestId?: number, booking_id?: number }) => void} [opts.onPendingBookingCancelled]
 * @returns {() => void}
 */
export function connectDriverAvailableRidesSocket({ driverId, onPendingBookingCancelled }) {
  const base = resolveSocketBaseUrl()
  const token = getSessionDriverToken()
  if (!driverId || !token) {
    return () => {}
  }

  const socket = io(base || undefined, {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 8,
    reconnectionDelay: 1200,
    timeout: 20000,
    auth: { token },
  })

  const onPendingCancel = (payload) => {
    onPendingBookingCancelled?.(payload)
  }

  socket.on('connect', () => {
    socket.emit('join-driver-room', driverId)
  })
  socket.on('pending-booking-cancelled', onPendingCancel)

  return () => {
    socket.off('pending-booking-cancelled', onPendingCancel)
    socket.removeAllListeners()
    socket.disconnect()
  }
}

/**
 * Rider: join `user-{id}` — ride lifecycle + optional in-app DB notifications (`app-notification`).
 * @param {(payload: { notification?: object }) => void} [opts.onAppNotification]
 */
export function connectRiderUserSocket({
  userId,
  onRideAssigned,
  onTripCompleted,
  onTripCancelled,
  onAppNotification,
}) {
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
  const onNotif = (payload) => onAppNotification?.(payload)

  socket.on('connect', () => {
    socket.emit('join-user-room', userId)
  })
  socket.on('rider-ride-assigned', onAssigned)
  socket.on('rider-trip-completed', onDone)
  socket.on('rider-trip-cancelled', onCancel)
  if (onAppNotification) {
    socket.on('app-notification', onNotif)
  }

  return () => {
    socket.off('rider-ride-assigned', onAssigned)
    socket.off('rider-trip-completed', onDone)
    socket.off('rider-trip-cancelled', onCancel)
    if (onAppNotification) socket.off('app-notification', onNotif)
    socket.removeAllListeners()
    socket.disconnect()
  }
}

/**
 * Driver app shell: join `driver-{id}` for `app-notification` (saved in DB on server).
 * @param {object} opts
 * @param {number} opts.driverId
 * @param {(payload: { notification?: object }) => void} [opts.onAppNotification]
 * @returns {() => void}
 */
export function connectDriverAppNotificationsSocket({ driverId, onAppNotification }) {
  const base = resolveSocketBaseUrl()
  const token = getSessionDriverToken()
  if (!driverId || !token || !onAppNotification) {
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

  const onNotif = (payload) => onAppNotification(payload)

  socket.on('connect', () => {
    socket.emit('join-driver-room', driverId)
  })
  socket.on('app-notification', onNotif)

  return () => {
    socket.off('app-notification', onNotif)
    socket.removeAllListeners()
    socket.disconnect()
  }
}
