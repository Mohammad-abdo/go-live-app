import { api } from '@/lib/api'
import { getErrorMessage, unwrapData } from '@/lib/apiResponse'

const U = '/apimobile/user'

export async function getRiderProfile() {
  const res = await api.get(`${U}/profile`)
  return unwrapData(res)
}

export async function getHomeServices() {
  const res = await api.get(`${U}/home/services`)
  return unwrapData(res)
}

export async function getAddresses() {
  const res = await api.get(`${U}/addresses`)
  return unwrapData(res)
}

export async function deleteAddress(id) {
  const res = await api.delete(`${U}/addresses/${id}`)
  return unwrapData(res)
}

export async function addAddress(body) {
  const res = await api.post(`${U}/addresses`, body)
  return unwrapData(res)
}

/** @param {number|string} serviceId */
export async function getVehicleTypes(serviceId) {
  const res = await api.get(`${U}/booking/vehicle-types/${serviceId}`)
  return unwrapData(res)
}

export async function createBooking(body) {
  const res = await api.post(`${U}/booking/create`, body)
  return unwrapData(res)
}

function nearDriversPayload(body) {
  // If the caller already provided a radius, do not override it.
  if (body && body.radius_km != null) return body
  const raw = import.meta.env.VITE_NEAR_DRIVER_SEARCH_RADIUS_KM
  const radiusKm =
    raw === '' || raw === undefined ? 15 : Number(String(raw).trim())
  const useRadius = Number.isFinite(radiusKm) && radiusKm > 0
  if (!useRadius) return body
  return { ...body, radius_km: radiusKm }
}

/** Backend may return HTTP 200 with `{ success: false }` when no drivers in range. Sends `radius_km` when >0 so APIs that support it can exceed a fixed 5km cap. */
export async function getNearDrivers(body) {
  const res = await api.post(`${U}/offers/near-drivers`, nearDriversPayload(body))
  const b = res.data
  return {
    ok: b?.success !== false,
    message: b?.message,
    drivers: Array.isArray(b?.data) ? b.data : [],
    booking: b?.booking && typeof b.booking === 'object' ? b.booking : null,
  }
}

function mapPreviewRadiusPayload(lat, lng) {
  const raw =
    import.meta.env.VITE_MAP_NEARBY_PREVIEW_RADIUS_KM || import.meta.env.VITE_NEAR_DRIVER_SEARCH_RADIUS_KM
  const radiusKm =
    raw === '' || raw === undefined ? 12 : Number(String(raw).trim())
  const body = { lat, lng }
  if (Number.isFinite(radiusKm) && radiusKm > 0) {
    body.radius_km = Math.min(30, Math.max(2, radiusKm))
  }
  return body
}

/** Home map only: online drivers near pickup (no booking). Requires rider JWT. */
export async function getMapNearbyDriversPreview({ lat, lng }) {
  const res = await api.post(`${U}/map/nearby-drivers`, mapPreviewRadiusPayload(lat, lng))
  const b = res.data
  return {
    ok: b?.success !== false,
    drivers: Array.isArray(b?.data) ? b.data : [],
  }
}

/** @param {{ firstName?: string, lastName?: string, email?: string, gender?: string, address?: string }} fields */
export async function updateRiderProfile(fields) {
  const res = await api.put(`${U}/profile/update`, fields)
  return unwrapData(res)
}

/** Rider accepts current negotiated fare (ride already in negotiating + driver set). Optional after driver counter-offer. */
export async function acceptNegotiation(rideRequestId) {
  const res = await api.post(`${U}/negotiation/accept`, { rideRequestId })
  return unwrapData(res)
}

export async function acceptDriver(body) {
  const res = await api.post(`${U}/offers/accept-driver`, body)
  return unwrapData(res)
}

export async function cancelTrip(body) {
  const bookingId = body?.booking_id ?? body?.bookingId
  const payload = {
    ...body,
    ...(bookingId != null ? { booking_id: String(bookingId).trim() } : {}),
  }
  try {
    const res = await api.post(`${U}/offers/cancel-trip`, payload)
    return unwrapData(res)
  } catch (e) {
    const status = /** @type {any} */ (e)?.response?.status
    const msg = String(getErrorMessage(e) || '')
    if (
      status === 400 &&
      /already cancelled|Trip is already cancelled|Cannot cancel a completed trip/i.test(msg)
    ) {
      return { alreadyFinal: true }
    }
    throw e
  }
}

export async function getMyBookings(params) {
  const res = await api.get(`${U}/my-bookings`, { params })
  return unwrapData(res)
}

export async function getActiveRide() {
  const res = await api.get(`${U}/offers/active-ride`)
  return unwrapData(res)
}

/** @param {string|number} bookingId */
export async function getTripStatus(bookingId) {
  const res = await api.get(`${U}/offers/trip-status/${bookingId}`)
  return unwrapData(res)
}

/** @param {{ driver_id: number|string, booking_id: number|string }} body */
export async function trackDriver(body) {
  const res = await api.post(`${U}/offers/track-driver`, body)
  return unwrapData(res)
}

/** @param {{ driver_id?: number|string, booking_id: number|string }} body */
export async function tripEnd(body) {
  const res = await api.post(`${U}/offers/trip-end`, body)
  return unwrapData(res)
}

/** @param {{ driver_id: number|string, booking_id: number|string, rate: number|string, text?: string }} body */
export async function rateDriver(body) {
  const res = await api.post(`${U}/offers/rate-driver`, body)
  return unwrapData(res)
}

/** @param {string|number} id */
export async function getBookingById(id) {
  const res = await api.get(`${U}/my-bookings/${id}`)
  return unwrapData(res)
}

/** @param {{ book_id: number|string, text: string, trip_code?: string }} body */
export async function addBookingReview(body) {
  const res = await api.post(`${U}/my-bookings/review`, body)
  return unwrapData(res)
}

/** @param {{ rideRequestId: number|string, amount: number|string }} body */
export async function tipDriver(body) {
  const res = await api.post(`${U}/offers/tip`, body)
  return unwrapData(res)
}

export async function getNotifications() {
  const res = await api.get(`${U}/notifications`)
  return unwrapData(res)
}

export async function getBankCards() {
  const res = await api.get(`${U}/bank-cards`)
  return unwrapData(res)
}

export async function addBankCard(body) {
  const res = await api.post(`${U}/add-bank-card`, body)
  return unwrapData(res)
}

export async function removeBankCard(id) {
  const res = await api.delete(`${U}/bank-cards/${id}`)
  return unwrapData(res)
}

export async function getHelpCenter() {
  const res = await api.get(`${U}/static/help-center`)
  return unwrapData(res)
}

export async function logoutRider() {
  const res = await api.post(`${U}/logout`)
  return unwrapData(res)
}

/** @param {string|number} rideId */
export async function getRideChat(rideId, params) {
  const res = await api.get(`/apimobile/chat/rides/${rideId}/messages`, { params })
  return unwrapData(res)
}

/** @param {string|number} rideId */
export async function sendRideChatMessage(rideId, message) {
  const res = await api.post(`/apimobile/chat/rides/${rideId}/messages`, { message })
  return unwrapData(res)
}
