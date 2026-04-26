import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { cn } from '@/lib/utils'
import { reverseGeocode } from '@/lib/osmGeocode'

function pinIcon(color) {
  return L.divIcon({
    className: 'go-map-pin',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.28)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function captainIcon() {
  return L.divIcon({
    className: 'go-map-captain',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function formatAddr(lat, lng) {
  return `موقع على الخريطة (${lat.toFixed(4)}, ${lng.toFixed(4)})`
}

/** @param {Record<string, unknown>} d */
function driverLatLng(d) {
  const cl = d?.currentLocation
  if (cl && typeof cl === 'object') {
    const la = parseFloat(String(cl.lat ?? ''))
    const lo = parseFloat(String(cl.lng ?? ''))
    if (Number.isFinite(la) && Number.isFinite(lo)) return { id: d.id, lat: la, lng: lo }
  }
  const la = parseFloat(String(d?.latitude ?? d?.lat ?? ''))
  const lo = parseFloat(String(d?.longitude ?? d?.lng ?? ''))
  if (Number.isFinite(la) && Number.isFinite(lo)) return { id: d.id, lat: la, lng: lo }
  return null
}

function MapClickLayer({ mode, onPick }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      onPick(mode, lat, lng)
    },
  })
  return null
}

/** First paint: show both pins in frame (interactive plan only). */
function MapInitialFit({ pickup, dropoff }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    try {
      map.fitBounds(L.latLngBounds(L.latLng(pickup.lat, pickup.lng), L.latLng(dropoff.lat, dropoff.lng)), {
        padding: [56, 56],
        maxZoom: 15,
        animate: false,
      })
    } catch (_) {}
  }, [map, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng])
  return null
}

/** Read-only / matching: fit route + nearby captain markers (debounced; avoids jitter on poll). */
function MapFitRouteAndCaptains({ pickup, dropoff, nearbyDrivers }) {
  const map = useMap()
  const key = useMemo(() => {
    const parts = [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]
    for (const d of nearbyDrivers || []) {
      const p = driverLatLng(d)
      if (p) parts.push(p.lat, p.lng)
    }
    return parts.join('|')
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, nearbyDrivers])

  useEffect(() => {
    const pts = [L.latLng(pickup.lat, pickup.lng), L.latLng(dropoff.lat, dropoff.lng)]
    for (const d of nearbyDrivers || []) {
      const p = driverLatLng(d)
      if (p) pts.push(L.latLng(p.lat, p.lng))
    }
    if (pts.length < 2) return
    const t = window.setTimeout(() => {
      try {
        const b = L.latLngBounds(pts)
        map.invalidateSize()
        map.fitBounds(b, { padding: [52, 52], maxZoom: 15, animate: false })
      } catch (_) {}
    }, 220)
    return () => window.clearTimeout(t)
  }, [map, key, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, nearbyDrivers])
  return null
}

/** After «موقعي GPS» — fly to pickup so the user sees themselves immediately. */
function MapFlyToPickup({ pickup, recenterTick }) {
  const map = useMap()
  const prev = useRef(0)
  useEffect(() => {
    if (!recenterTick || recenterTick === prev.current) return
    prev.current = recenterTick
    const z = Math.max(map.getZoom(), 15)
    map.flyTo([pickup.lat, pickup.lng], z, { duration: 0.55 })
  }, [recenterTick, map, pickup.lat, pickup.lng])
  return null
}

/**
 * Interactive OSM map: tap to set pickup/dropoff (active mode), drag pins to adjust.
 * @param {{ recenterTick?: number, readOnly?: boolean, nearbyDrivers?: unknown[] }} props — bump `recenterTick` after GPS / geocode so the map flies to pickup.
 */
export default function TripMapPicker({
  className,
  pickup,
  dropoff,
  mapMode,
  onPickupChange,
  onDropoffChange,
  recenterTick = 0,
  readOnly = false,
  nearbyDrivers = [],
}) {
  const [mounted, setMounted] = useState(false)
  const geoPickupSeq = useRef(0)
  const geoDropoffSeq = useRef(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  const center = useMemo(() => {
    const midLat = (pickup.lat + dropoff.lat) / 2
    const midLng = (pickup.lng + dropoff.lng) / 2
    return [midLat, midLng]
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng])

  const applyPickup = useCallback(
    (lat, lng) => {
      const id = ++geoPickupSeq.current
      onPickupChange({ lat, lng, address: formatAddr(lat, lng) })
      void reverseGeocode(lat, lng).then((hit) => {
        if (id !== geoPickupSeq.current || !hit?.address) return
        onPickupChange({ lat, lng, address: hit.address })
      })
    },
    [onPickupChange],
  )

  const applyDropoff = useCallback(
    (lat, lng) => {
      const id = ++geoDropoffSeq.current
      onDropoffChange({ lat, lng, address: formatAddr(lat, lng) })
      void reverseGeocode(lat, lng).then((hit) => {
        if (id !== geoDropoffSeq.current || !hit?.address) return
        onDropoffChange({ lat, lng, address: hit.address })
      })
    },
    [onDropoffChange],
  )

  const onPick = useCallback(
    (mod, lat, lng) => {
      if (readOnly) return
      if (mod === 'pickup') applyPickup(lat, lng)
      else applyDropoff(lat, lng)
    },
    [readOnly, applyPickup, applyDropoff],
  )

  const onPickupDragEnd = useCallback(
    (e) => {
      if (readOnly) return
      const m = e.target.getLatLng()
      applyPickup(m.lat, m.lng)
    },
    [readOnly, applyPickup],
  )

  const onDropoffDragEnd = useCallback(
    (e) => {
      if (readOnly) return
      const m = e.target.getLatLng()
      applyDropoff(m.lat, m.lng)
    },
    [readOnly, applyDropoff],
  )

  const captainMarkers = useMemo(() => {
    const out = []
    for (const d of nearbyDrivers || []) {
      const p = driverLatLng(d)
      if (p) out.push({ key: String(p.id ?? `${p.lat},${p.lng}`), ...p })
    }
    return out
  }, [nearbyDrivers])

  if (!mounted) {
    return <div className={cn('animate-pulse bg-[#dfe3ea]', className)} aria-hidden />
  }

  return (
    <div className={cn('size-full [&_.leaflet-container]:size-full [&_.leaflet-container]:bg-[#e8eaef]', className)}>
      <MapContainer center={center} zoom={13} scrollWheelZoom className="z-0 size-full" style={{ minHeight: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {readOnly ? (
          <MapFitRouteAndCaptains pickup={pickup} dropoff={dropoff} nearbyDrivers={nearbyDrivers} />
        ) : (
          <>
            <MapInitialFit pickup={pickup} dropoff={dropoff} />
            <MapFlyToPickup pickup={pickup} recenterTick={recenterTick} />
          </>
        )}
        {!readOnly ? <MapClickLayer mode={mapMode} onPick={onPick} /> : null}
        {captainMarkers.map((p) => (
          <Marker key={p.key} position={[p.lat, p.lng]} icon={captainIcon()} />
        ))}
        <Marker
          position={[pickup.lat, pickup.lng]}
          icon={pinIcon('#34C759')}
          draggable={!readOnly}
          eventHandlers={readOnly ? {} : { dragend: onPickupDragEnd }}
        />
        <Marker
          position={[dropoff.lat, dropoff.lng]}
          icon={pinIcon('#FF3B30')}
          draggable={!readOnly}
          eventHandlers={readOnly ? {} : { dragend: onDropoffDragEnd }}
        />
      </MapContainer>
    </div>
  )
}
