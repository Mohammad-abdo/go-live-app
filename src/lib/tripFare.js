const EARTH_RADIUS_KM = 6371

/**
 * Great-circle distance in kilometers (WGS84 approximation).
 */
export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.asin(Math.sqrt(Math.min(1, a)))
  return EARTH_RADIUS_KM * c
}

/**
 * Fare from admin **PricingRule** (same logic as backend `calculateTripPrice` distance leg; no time/wait).
 * @param {number} distanceKm
 * @param {{ baseFare?: number, baseDistance?: number, minimumFare?: number, perDistanceAfterBase?: number } | null | undefined} rule — from `GET .../booking/vehicle-types/:id` → `pricingRule`
 * @returns {number | null} rounded EGP, or `null` if no rule (caller may use env fallback)
 */
export function computeFareFromPricingRule(distanceKm, rule) {
  if (!rule || typeof rule !== 'object') return null
  const d = Number(distanceKm)
  if (!Number.isFinite(d) || d < 0) return 0
  const baseFare = Number(rule.baseFare) || 0
  const bd = Number(rule.baseDistance)
  const baseDist = Number.isFinite(bd) && bd > 0 ? bd : 5
  const perKm = Number(rule.perDistanceAfterBase) || 0
  const minFare = Number(rule.minimumFare) || 0

  let distanceCharge = 0
  if (d > baseDist) {
    distanceCharge = (d - baseDist) * perKm
  }
  let total = baseFare + distanceCharge
  if (minFare > 0 && total < minFare) {
    total = minFare
  }
  return Math.max(0, Math.round(total))
}

/** Fallback when API sends no `pricingRule` (dev only). Uses flat EGP/km. */
export function computeFallbackDistanceOnlyFare(distanceKm, pricePerKm) {
  const d = Number(distanceKm)
  const per = Number(pricePerKm)
  if (!Number.isFinite(d) || d < 0) return 0
  if (!Number.isFinite(per) || per < 0) return 0
  return Math.max(0, Math.round(d * per))
}

/**
 * @deprecated — kept for any old call sites; prefer `computeFareFromPricingRule` + admin `pricingRule`.
 */
export function computeTripFareEgp(distanceKm, pricePerKm, categoryPercent) {
  const d = Number(distanceKm)
  const per = Number(pricePerKm)
  const pct = Number(categoryPercent)
  if (!Number.isFinite(d) || d < 0) return 0
  if (!Number.isFinite(per) || per < 0) return 0
  const base = d * per
  const mul = Number.isFinite(pct) && pct >= 0 ? 1 + pct / 100 : 1
  return Math.max(0, Math.round(base * mul))
}

/** @deprecated */
export function computeKmBaseEgp(distanceKm, pricePerKm) {
  const d = Number(distanceKm)
  const per = Number(pricePerKm)
  if (!Number.isFinite(d) || d < 0 || !Number.isFinite(per) || per < 0) return 0
  return Math.max(0, Math.round(d * per))
}
