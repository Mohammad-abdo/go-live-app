import { api } from '@/lib/api'
import { unwrapData } from '@/lib/apiResponse'

const D = '/apimobile/driver'

export async function getMyRides(params) {
  const res = await api.get(`${D}/rides`, { params })
  return unwrapData(res)
}

export async function getMyStatus() {
  const res = await api.get(`${D}/status`)
  return unwrapData(res)
}

/** Full driver profile including `stats` (totalRides, completedRides, totalEarnings, …). */
export async function getDriverProfile() {
  const res = await api.get(`${D}/profile`)
  return unwrapData(res)
}

/** Summary from GET /ratings (average from riders). */
export async function getDriverRatingsSummary() {
  const res = await api.get(`${D}/ratings`, { params: { page: 1, per_page: 1 } })
  const body = res?.data
  if (body?.summary) return body.summary
  return { averageRating: 0, totalRatings: 0 }
}

export async function goOnlineOffline() {
  const res = await api.post(`${D}/status/go-online`)
  return unwrapData(res)
}

/** @param {{ latitude: number|string, longitude: number|string, currentHeading?: number|string }} body */
export async function updateDriverLocation(body) {
  const res = await api.post(`${D}/location/update`, body)
  return unwrapData(res)
}

/**
 * Pending rides near driver (requires lat/lng).
 * @param {{ latitude: number|string, longitude: number|string, radius?: number|string }} params
 */
export async function getAvailableRides(params) {
  const res = await api.get(`${D}/rides/available`, { params })
  return unwrapData(res)
}

/** @param {{ rideRequestId: number|string, accept: boolean, proposedFare?: number|string, rejectReason?: string }} body */
export async function respondToRide(body) {
  const res = await api.post(`${D}/rides/respond`, body)
  return unwrapData(res)
}

/** @param {string|number} id */
export async function getRideDetail(id) {
  const res = await api.get(`${D}/rides/${id}`)
  return unwrapData(res)
}

/** @param {{ booking_id?: number|string, rideRequestId?: number|string, status: 'arrived'|'started' }} body */
export async function updateRideStatus(body) {
  const res = await api.post(`${D}/rides/update-status`, body)
  return unwrapData(res)
}

/** @param {{ booking_id?: number|string, rideRequestId?: number|string, tips?: number|string }} body */
export async function completeRide(body) {
  const res = await api.post(`${D}/rides/complete`, body)
  return unwrapData(res)
}

/** @param {{ booking_id?: number|string, rideRequestId?: number|string, reason?: string }} body */
export async function cancelRideDriver(body) {
  const res = await api.post(`${D}/rides/cancel`, body)
  return unwrapData(res)
}

export async function getHelpCenter() {
  const res = await api.get(`${D}/static/help-center`)
  return unwrapData(res)
}

export async function getNotifications(params) {
  const res = await api.get(`${D}/notifications`, { params })
  return res.data
}

export async function logoutDriver() {
  const res = await api.post(`${D}/auth/logout`)
  return unwrapData(res)
}
