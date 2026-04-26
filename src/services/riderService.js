import { api } from '@/lib/api'
import { unwrapData } from '@/lib/apiResponse'

const U = '/apimobile/user'

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
  }
}

export async function acceptDriver(body) {
  const res = await api.post(`${U}/offers/accept-driver`, body)
  return unwrapData(res)
}

export async function cancelTrip(body) {
  const res = await api.post(`${U}/offers/cancel-trip`, body)
  return unwrapData(res)
}

export async function getMyBookings(params) {
  const res = await api.get(`${U}/my-bookings`, { params })
  return unwrapData(res)
}

export async function getActiveRide() {
  const res = await api.get(`${U}/offers/active-ride`)
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
