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
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
          <Marker position={[Number(driver.lat), Number(driver.lng)]} icon={pinIcon('#007AFF')} />
        ) : null}
      </MapContainer>
    </div>
  )
}
