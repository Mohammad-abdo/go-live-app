import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { cn } from '@/lib/utils'
import MapOverlayControls from '@/components/map/MapOverlayControls'

function pinIcon(color) {
  return L.divIcon({
    className: 'go-map-pin',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.28)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function normalizeHeadingDeg(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return ((n % 360) + 360) % 360
}

function carIcon({ headingDeg = 0, color = '#2563eb' } = {}) {
  const deg = normalizeHeadingDeg(headingDeg)
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <g transform="translate(13 13) rotate(${deg}) translate(-13 -13)">
        <path d="M6.1 10.2c.3-.9 1.1-1.6 2.1-1.8l6.1-1c1.3-.2 2.6.4 3.2 1.6l1.6 3.1c.3.5.8.9 1.4 1l.6.1c.5.1.9.5.9 1v2.3c0 .6-.5 1.1-1.1 1.1h-1.2a2.2 2.2 0 0 1-4.4 0H10a2.2 2.2 0 0 1-4.4 0H4.4c-.6 0-1.1-.5-1.1-1.1v-2.1c0-.5.3-.9.8-1.1l.6-.2c.5-.2.9-.6 1.1-1.1l.3-.8z" fill="${color}"/>
        <path d="M9.4 9.6 14 8.8c.7-.1 1.4.2 1.7.8l1.1 2.2H8.6l.8-2.2z" fill="rgba(255,255,255,.55)"/>
        <circle cx="8.3" cy="18" r="1.6" fill="#0b1220" opacity=".9"/>
        <circle cx="17.7" cy="18" r="1.6" fill="#0b1220" opacity=".9"/>
      </g>
    </svg>
  `)

  return L.divIcon({
    className: 'go-map-car',
    html: `
      <div style="
        width:28px;height:28px;
        display:flex;align-items:center;justify-content:center;
        border-radius:10px;
        background:rgba(255,255,255,.92);
        box-shadow:0 6px 18px rgba(0,0,0,.18);
        border:1px solid rgba(0,0,0,.08);
        backdrop-filter: blur(6px);
      ">
        <img alt="" style="width:26px;height:26px;display:block" src="data:image/svg+xml,${svg}" />
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

/** Fit map to pickup + dropoff only — driver updates must not reset zoom (was re-fitting on every GPS tick). */
function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    const valid = points.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
    if (valid.length === 0) return
    if (valid.length === 1) {
      map.setView(valid[0], 14)
      return
    }
    map.fitBounds(L.latLngBounds(valid), { padding: [48, 48], maxZoom: 15 })
  }, [map, points])
  return null
}

/**
 * Read-only OSM map: pickup (green), dropoff (red), optional driver (blue), route hint between stops.
 * @param {{ className?: string, pickup?: { lat: number, lng: number }, dropoff?: { lat: number, lng: number }, driver?: { lat: number, lng: number } | null, showRoute?: boolean }} props
 */
export default function TripLiveMap({ className, pickup, dropoff, driver, showRoute = true }) {
  // This app is client-only (Vite SPA). Leaflet depends on DOM, but we always run in the browser here.

  const center = useMemo(() => {
    const plat = Number(pickup?.lat)
    const plng = Number(pickup?.lng)
    const dlat = Number(dropoff?.lat)
    const dlng = Number(dropoff?.lng)
    if (Number.isFinite(plat) && Number.isFinite(plng)) return [plat, plng]
    if (Number.isFinite(dlat) && Number.isFinite(dlng)) return [dlat, dlng]
    return [30.0444, 31.2357]
  }, [pickup, dropoff])

  /** Stops only — used for initial fit so live driver position does not trigger fitBounds / zoom reset. */
  const boundsPoints = useMemo(() => {
    const out = []
    const p1 = [Number(pickup?.lat), Number(pickup?.lng)]
    const p2 = [Number(dropoff?.lat), Number(dropoff?.lng)]
    if (Number.isFinite(p1[0]) && Number.isFinite(p1[1])) out.push(p1)
    if (Number.isFinite(p2[0]) && Number.isFinite(p2[1])) out.push(p2)
    return out
  }, [pickup, dropoff])

  const routeLine = useMemo(() => {
    if (!showRoute) return null
    const a = [Number(pickup?.lat), Number(pickup?.lng)]
    const b = [Number(dropoff?.lat), Number(dropoff?.lng)]
    if (
      !Number.isFinite(a[0]) ||
      !Number.isFinite(a[1]) ||
      !Number.isFinite(b[0]) ||
      !Number.isFinite(b[1])
    ) {
      return null
    }
    return [a, b]
  }, [pickup, dropoff, showRoute])

  return (
    <div
      className={cn(
        'isolate size-full min-h-0 touch-manipulation [&_.leaflet-container]:size-full [&_.leaflet-container]:min-h-[inherit] [&_.leaflet-container]:bg-[#e8eaef]',
        className,
      )}
    >
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="z-0 size-full min-h-[inherit]"
        style={{ minHeight: 'inherit', height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          // Avoid {s} subdomains (a/b/c) since some networks throttle them differently.
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          referrerPolicy="no-referrer"
        />
        <FitBounds points={boundsPoints} />
        <MapOverlayControls focus={driver || pickup || dropoff || null} />
        {routeLine ? (
          <Polyline
            positions={routeLine}
            pathOptions={{
              color: '#5C2D8E',
              weight: 4,
              opacity: 0.55,
              dashArray: '10 8',
            }}
          />
        ) : null}
        {Number.isFinite(Number(pickup?.lat)) && Number.isFinite(Number(pickup?.lng)) ? (
          <Marker position={[Number(pickup.lat), Number(pickup.lng)]} icon={pinIcon('#34C759')} />
        ) : null}
        {Number.isFinite(Number(dropoff?.lat)) && Number.isFinite(Number(dropoff?.lng)) ? (
          <Marker position={[Number(dropoff.lat), Number(dropoff.lng)]} icon={pinIcon('#FF3B30')} />
        ) : null}
        {driver &&
        Number.isFinite(Number(driver.lat)) &&
        Number.isFinite(Number(driver.lng)) ? (
          <Marker
            position={[Number(driver.lat), Number(driver.lng)]}
            icon={carIcon({ headingDeg: driver.heading ?? driver.currentHeading, color: '#2563eb' })}
          />
        ) : null}
      </MapContainer>
    </div>
  )
}
