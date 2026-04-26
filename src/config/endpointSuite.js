/**
 * Live API steps for Go backend (same surface as backend/scripts/testUserEndpoints.js).
 * `path` may be a string or (ctx) => string. `skip` optional (ctx) => boolean.
 * `body` optional object or (ctx) => object for non-GET.
 * `query` optional object for GET params.
 * `okStatuses` optional number[] — default [200, 201, 204].
 */

/** @param {any} resData Axios `response.data` (body JSON) */
export function extractToken(resData) {
  const d = resData?.data
  return d?.token ?? d?.accessToken ?? resData?.token ?? resData?.accessToken ?? null
}

function firstId(payload) {
  const d = payload?.data
  if (Array.isArray(d) && d.length) return d[0]?.id ?? d[0]?.serviceId ?? null
  if (d && typeof d === 'object') return d.id ?? d.serviceId ?? null
  return null
}

export function hydrateFromResponse(stepId, ctx, responseData) {
  if (stepId === 'services.all') {
    const id = firstId(responseData)
    if (id) ctx.serviceId = id
  }
  if (stepId === 'booking.vehicle-types') {
    const d = responseData?.data
    const first = Array.isArray(d) ? d[0] : d
    const vid = first?.id ?? first?.vehicleCategoryId ?? first?.vehicle_category_id
    if (vid) ctx.vehicleCategoryId = vid
  }
  if (stepId === 'booking.create') {
    const d = responseData?.data
    const rid = d?.booking_id ?? d?.rideRequestId ?? d?.id ?? responseData?.booking_id
    if (rid != null) ctx.rideId = rid
  }
}

export const STEPS = [
  { id: 'health', method: 'GET', path: '/api/health', auth: 'none', okStatuses: [200] },
  { id: 'health.socket', method: 'GET', path: '/api/health/socket', auth: 'none', okStatuses: [200, 404] },
  {
    id: 'auth.user.current-location',
    method: 'POST',
    path: '/apimobile/user/auth/current-location',
    auth: 'rider',
    body: { latitude: 30.0444, longitude: 31.2357 },
    okStatuses: [200, 201],
    write: true,
  },
  { id: 'home.slider', method: 'GET', path: '/apimobile/user/home/slider-offers', auth: 'rider' },
  { id: 'home.services', method: 'GET', path: '/apimobile/user/home/services', auth: 'rider' },
  { id: 'home.last-booking', method: 'GET', path: '/apimobile/user/home/last-booking', auth: 'rider' },
  { id: 'services.all', method: 'GET', path: '/apimobile/user/services/all', auth: 'rider' },
  {
    id: 'services.choose',
    method: 'GET',
    path: (ctx) => `/apimobile/user/services/choose/${ctx.serviceId}`,
    auth: 'rider',
    skip: (ctx) => !ctx.serviceId,
  },
  {
    id: 'booking.vehicle-types',
    method: 'GET',
    path: (ctx) => `/apimobile/user/booking/vehicle-types/${ctx.serviceId}`,
    auth: 'rider',
    skip: (ctx) => !ctx.serviceId,
  },
  {
    id: 'booking.shipment-sizes',
    method: 'GET',
    path: '/apimobile/user/booking/shipment-sizes',
    auth: 'rider',
    skip: (ctx) => !ctx.vehicleCategoryId,
    query: (ctx) => ({ vehicleCategoryId: ctx.vehicleCategoryId }),
  },
  {
    id: 'booking.shipment-weights',
    method: 'GET',
    path: '/apimobile/user/booking/shipment-weights',
    auth: 'rider',
    skip: (ctx) => !ctx.vehicleCategoryId,
    query: (ctx) => ({ vehicleCategoryId: ctx.vehicleCategoryId }),
  },
  { id: 'booking.payment-methods', method: 'GET', path: '/apimobile/user/booking/payment-methods', auth: 'rider' },
  {
    id: 'booking.create',
    method: 'POST',
    path: '/apimobile/user/booking/create',
    auth: 'rider',
    write: true,
    skip: (ctx) => !ctx.includeWrites || Boolean(ctx.manualRideId),
    body: (ctx) => ({
      vehicle_id: ctx.vehicleCategoryId,
      shipmentSize_id: null,
      shipmentWeight_id: null,
      paymentMethod: 'cash',
      from: { lat: 30.0444, lng: 31.2357, address: 'Tahrir Sq, Cairo' },
      to: { lat: 30.0595, lng: 31.2234, address: 'Zamalek, Cairo' },
    }),
    okStatuses: [200, 201],
  },
  {
    id: 'offers.near-drivers',
    method: 'POST',
    path: '/apimobile/user/offers/near-drivers',
    auth: 'rider',
    write: true,
    skip: (ctx) => !ctx.includeWrites || !ctx.rideId,
    body: (ctx) => ({
      booking_id: ctx.rideId,
      booking_location: { lat: 30.0444, lng: 31.2357 },
    }),
    okStatuses: [200, 201, 400, 404],
  },
  {
    id: 'offers.trip-status',
    method: 'GET',
    path: (ctx) => `/apimobile/user/offers/trip-status/${ctx.rideId}`,
    auth: 'rider',
    skip: (ctx) => !ctx.rideId,
    okStatuses: [200, 404],
  },
  {
    id: 'offers.active-ride',
    method: 'GET',
    path: '/apimobile/user/offers/active-ride',
    auth: 'rider',
    okStatuses: [200, 404],
  },
  {
    id: 'my-bookings.details',
    method: 'GET',
    path: (ctx) => `/apimobile/user/my-bookings/${ctx.rideId}`,
    auth: 'rider',
    skip: (ctx) => !ctx.rideId,
    okStatuses: [200, 404],
  },
  {
    id: 'chat.rider.history',
    method: 'GET',
    path: (ctx) => `/apimobile/chat/rides/${ctx.rideId}/messages`,
    auth: 'rider',
    skip: (ctx) => !ctx.rideId,
    query: { limit: 30 },
    okStatuses: [200, 404],
  },
  {
    id: 'chat.rider.unread',
    method: 'GET',
    path: (ctx) => `/apimobile/chat/rides/${ctx.rideId}/unread-count`,
    auth: 'rider',
    skip: (ctx) => !ctx.rideId,
    okStatuses: [200, 404],
  },
  { id: 'my-bookings.list', method: 'GET', path: '/apimobile/user/my-bookings', auth: 'rider' },
  {
    id: 'my-bookings.filter',
    method: 'GET',
    path: '/apimobile/user/my-bookings/filter',
    auth: 'rider',
    query: { status: 'pending' },
  },
  { id: 'wallet.operations', method: 'GET', path: '/apimobile/user/wallet/operations', auth: 'rider' },
  {
    id: 'wallet.operations.filter',
    method: 'GET',
    path: '/apimobile/user/wallet/operations/filter',
    auth: 'rider',
    query: { type: 'all' },
  },
  { id: 'profile.me', method: 'GET', path: '/apimobile/user/profile', auth: 'rider' },
  { id: 'addresses.list', method: 'GET', path: '/apimobile/user/addresses', auth: 'rider' },
  { id: 'cards.list', method: 'GET', path: '/apimobile/user/bank-cards', auth: 'rider' },
  { id: 'static.privacy', method: 'GET', path: '/apimobile/user/static/privacy-policy', auth: 'rider' },
  { id: 'static.help-center', method: 'GET', path: '/apimobile/user/static/help-center', auth: 'rider' },
  { id: 'static.terms', method: 'GET', path: '/apimobile/user/static/terms', auth: 'rider' },
  { id: 'notifications', method: 'GET', path: '/apimobile/user/notifications', auth: 'rider' },
  {
    id: 'notifications.unread-count',
    method: 'GET',
    path: '/apimobile/user/notifications/unread-count',
    auth: 'rider',
    okStatuses: [200, 404],
  },
  {
    id: 'notifications.read-all',
    method: 'POST',
    path: '/apimobile/user/notifications/read-all',
    auth: 'rider',
    write: true,
    okStatuses: [200, 404],
  },
  {
    id: 'negotiation.settings',
    method: 'GET',
    path: '/apimobile/user/negotiation/settings',
    auth: 'none',
    okStatuses: [200],
  },
  {
    id: 'device-token.register',
    method: 'POST',
    path: '/apimobile/user/device-token',
    auth: 'rider',
    write: true,
    body: (ctx) => ({
      fcmToken: `LIVE_TEST_FCM_${ctx.runTag}`,
      playerId: 'LIVE_TEST_PLAYER',
      appVersion: '1.0.0',
      platform: 'android',
    }),
    okStatuses: [200, 404],
  },
  {
    id: 'coupons.validate',
    method: 'POST',
    path: '/apimobile/user/coupons/validate',
    auth: 'rider',
    write: true,
    body: { code: 'TEST', amount: 100 },
    okStatuses: [200, 404, 400],
  },
  {
    id: 'referral.get',
    method: 'GET',
    path: '/apimobile/user/referral',
    auth: 'rider',
    okStatuses: [200, 404],
  },
  {
    id: 'sos-contacts.list',
    method: 'GET',
    path: '/apimobile/user/sos-contacts',
    auth: 'rider',
    okStatuses: [200, 404],
  },
  {
    id: 'complaints.list',
    method: 'GET',
    path: '/apimobile/user/complaints',
    auth: 'rider',
    okStatuses: [200, 404],
  },
  /* ─── Driver app (JWT from driver login) ─── */
  { id: 'driver.documents.required', method: 'GET', path: '/apimobile/driver/documents/required', auth: 'none', okStatuses: [200] },
  {
    id: 'driver.auth.current-location',
    method: 'POST',
    path: '/apimobile/driver/auth/current-location',
    auth: 'driver',
    body: { latitude: 30.05, longitude: 31.24 },
    okStatuses: [200, 201],
    write: true,
    skip: (ctx) => !ctx.driverToken,
  },
  {
    id: 'driver.profile',
    method: 'GET',
    path: '/apimobile/driver/profile',
    auth: 'driver',
    skip: (ctx) => !ctx.driverToken,
    okStatuses: [200, 403, 404],
  },
  {
    id: 'driver.profile.status',
    method: 'GET',
    path: '/apimobile/driver/profile/status',
    auth: 'driver',
    skip: (ctx) => !ctx.driverToken,
    okStatuses: [200, 403, 404],
  },
  {
    id: 'driver.documents',
    method: 'GET',
    path: '/apimobile/driver/documents',
    auth: 'driver',
    skip: (ctx) => !ctx.driverToken,
    okStatuses: [200, 403, 404],
  },
  {
    id: 'driver.bank-cards',
    method: 'GET',
    path: '/apimobile/driver/bank-cards',
    auth: 'driver',
    skip: (ctx) => !ctx.driverToken,
    okStatuses: [200, 403, 404],
  },
  {
    id: 'driver.status',
    method: 'GET',
    path: '/apimobile/driver/status',
    auth: 'driver',
    skip: (ctx) => !ctx.driverToken,
    okStatuses: [200, 403, 404],
  },
  {
    id: 'driver.rides',
    method: 'GET',
    path: '/apimobile/driver/rides',
    auth: 'driver',
    skip: (ctx) => !ctx.driverToken,
    okStatuses: [200, 403, 404],
  },
  {
    id: 'driver.rides.available',
    method: 'GET',
    path: '/apimobile/driver/rides/available',
    auth: 'driver',
    skip: (ctx) => !ctx.driverToken,
    okStatuses: [200, 403, 404],
  },
  {
    id: 'driver.notifications',
    method: 'GET',
    path: '/apimobile/driver/notifications',
    auth: 'driver',
    skip: (ctx) => !ctx.driverToken,
    okStatuses: [200, 403, 404],
  },
  {
    id: 'driver.wallet',
    method: 'GET',
    path: '/apimobile/driver/wallet',
    auth: 'driver',
    skip: (ctx) => !ctx.driverToken,
    okStatuses: [200, 403, 404],
  },
  {
    id: 'driver.wallet.history',
    method: 'GET',
    path: '/apimobile/driver/wallet/history',
    auth: 'driver',
    skip: (ctx) => !ctx.driverToken,
    okStatuses: [200, 403, 404],
  },
  {
    id: 'driver.wallet.balance',
    method: 'GET',
    path: '/apimobile/driver/wallet/balance',
    auth: 'driver',
    skip: (ctx) => !ctx.driverToken,
    okStatuses: [200, 403, 404],
  },
  {
    id: 'driver.negotiation.settings',
    method: 'GET',
    path: '/apimobile/driver/negotiation/settings',
    auth: 'none',
    okStatuses: [200],
  },
  {
    id: 'driver.static.privacy',
    method: 'GET',
    path: '/apimobile/driver/static/privacy-policy',
    auth: 'driver',
    skip: (ctx) => !ctx.driverToken,
    okStatuses: [200, 401, 403, 404],
  },
]
