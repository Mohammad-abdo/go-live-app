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
 * Trip fare: (distance × price per km) × (1 + categoryPercent/100).
 * `categoryPercent` comes from vehicle type `price` (treated as % markup, not flat EGP).
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

/** Base leg cost before category markup (for UI breakdown). */
export function computeKmBaseEgp(distanceKm, pricePerKm) {
  const d = Number(distanceKm)
  const per = Number(pricePerKm)
  if (!Number.isFinite(d) || d < 0 || !Number.isFinite(per) || per < 0) return 0
  return Math.max(0, Math.round(d * per))
}
