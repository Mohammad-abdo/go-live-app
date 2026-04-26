/** Nominatim — respect usage policy: cache, light queries, identifying User-Agent. */
const UA = 'GoLiveTester/1.0 (contact: dev; geocode)'

/**
 * @param {string} query
 * @returns {Promise<{ lat: number, lng: number, address: string } | null>}
 */
export async function geocodeFirstHit(query) {
  const q = String(query || '').trim()
  if (q.length < 3) return null
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ar,en',
        'User-Agent': UA,
      },
    })
    if (!res.ok) return null
    const arr = await res.json()
    const hit = Array.isArray(arr) ? arr[0] : null
    if (!hit) return null
    const lat = parseFloat(hit.lat)
    const lng = parseFloat(hit.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    const address = String(hit.display_name || q).trim()
    return { lat, lng, address }
  } catch {
    return null
  }
}

/**
 * @param {number|string} lat
 * @param {number|string} lng
 * @returns {Promise<{ lat: number, lng: number, address: string } | null>}
 */
export async function reverseGeocode(lat, lng) {
  const la = Number(lat)
  const lo = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(la))}&lon=${encodeURIComponent(String(lo))}`
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ar,en',
        'User-Agent': UA,
      },
    })
    if (!res.ok) return null
    const hit = await res.json()
    const address = String(hit?.display_name || '').trim()
    if (!address) return null
    return { lat: la, lng: lo, address }
  } catch {
    return null
  }
}
