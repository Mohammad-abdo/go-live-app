import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { cn } from '@/lib/utils'
import { reverseGeocode } from '@/lib/osmGeocode'
import MapOverlayControls from '@/components/map/MapOverlayControls'

function pinIcon(color) {
  return L.divIcon({
    className: 'go-map-pin',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.28)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function captainIcon() {
  return carIcon({ color: '#2563eb' })
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

function formatAddr(lat, lng) {
  return `موقع على الخريطة (${lat.toFixed(4)}, ${lng.toFixed(4)})`
}

/** @param {Record<string, unknown>} d */
function driverLatLng(d) {
  const cl = d?.currentLocation
  if (cl && typeof cl === 'object') {
    const la = parseFloat(String(cl.lat ?? ''))
    const lo = parseFloat(String(cl.lng ?? ''))
    const heading =
      d?.currentHeading ?? d?.heading ?? d?.current_heading ?? d?.heading_deg ?? cl.heading ?? cl.currentHeading
    if (Number.isFinite(la) && Number.isFinite(lo)) return { id: d.id, lat: la, lng: lo, heading }
  }
  const la = parseFloat(String(d?.latitude ?? d?.lat ?? ''))
  const lo = parseFloat(String(d?.longitude ?? d?.lng ?? ''))
  const heading = d?.currentHeading ?? d?.heading ?? d?.current_heading ?? d?.heading_deg
  if (Number.isFinite(la) && Number.isFinite(lo)) return { id: d.id, lat: la, lng: lo, heading }
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
    } catch {
      // ignore invalid bounds (rare: NaN)
    }
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
      } catch {
        // ignore
      }
    }, 220)
    return () => window.clearTimeout(t)
  }, [map, key, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, nearbyDrivers])
  return null
}

/** Read-only: fit pickup + dropoff once (do NOT refit on driver poll updates). */
function MapFitStopsOnce({ pickup, dropoff, fitKey }) {
  const map = useMap()
  const doneKey = useRef('')
  useEffect(() => {
    const k = String(fitKey || '')
    if (!k || doneKey.current === k) return
    doneKey.current = k
    try {
      map.fitBounds(L.latLngBounds(L.latLng(pickup.lat, pickup.lng), L.latLng(dropoff.lat, dropoff.lng)), {
        padding: [56, 56],
        maxZoom: 15,
        animate: false,
      })
    } catch {
      // ignore
    }
  }, [map, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, fitKey])
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
  searchRadiusKm = null,
}) {
  const geoPickupSeq = useRef(0)
  const geoDropoffSeq = useRef(0)

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

  const leadDriver = captainMarkers[0] || null
  const lineDriverToPickup = useMemo(() => {
    if (!readOnly || !leadDriver) return null
    return [
      [leadDriver.lat, leadDriver.lng],
      [pickup.lat, pickup.lng],
    ]
  }, [readOnly, leadDriver, pickup.lat, pickup.lng])

  const linePickupToDropoff = useMemo(() => {
    if (!readOnly) return null
    return [
      [pickup.lat, pickup.lng],
      [dropoff.lat, dropoff.lng],
    ]
  }, [readOnly, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng])

  return (
    <div className={cn('size-full [&_.leaflet-container]:size-full [&_.leaflet-container]:bg-[#e8eaef]', className)}>
      <MapContainer center={center} zoom={13} scrollWheelZoom className="z-0 size-full" style={{ minHeight: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          // Avoid {s} subdomains (a/b/c) since some networks throttle them differently.
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          referrerPolicy="no-referrer"
        />
        <MapOverlayControls focus={pickup || null} />
        {readOnly && searchRadiusKm != null && Number(searchRadiusKm) > 0 ? (
          <>
            <Circle
              center={[pickup.lat, pickup.lng]}
              radius={Math.min(80, Math.max(1, Number(searchRadiusKm))) * 1000}
              pathOptions={{
                color: '#5C2D8E',
                weight: 2,
                opacity: 0.35,
                fillColor: '#5C2D8E',
                fillOpacity: 0.08,
                className: 'go-search-circle',
              }}
            />
            <Circle
              center={[pickup.lat, pickup.lng]}
              radius={Math.min(80, Math.max(1, Number(searchRadiusKm))) * 1000}
              pathOptions={{
                color: '#5C2D8E',
                weight: 1,
                opacity: 0.18,
                dashArray: '6 8',
                className: 'go-search-circle-dash',
              }}
            />
          </>
        ) : null}
        {readOnly ? (
          <MapFitStopsOnce
            pickup={pickup}
            dropoff={dropoff}
            fitKey={`${pickup.lat},${pickup.lng}|${dropoff.lat},${dropoff.lng}|ro`}
          />
        ) : nearbyDrivers?.length ? (
          <>
            <MapFitRouteAndCaptains pickup={pickup} dropoff={dropoff} nearbyDrivers={nearbyDrivers} />
            <MapFlyToPickup pickup={pickup} recenterTick={recenterTick} />
          </>
        ) : (
          <>
            <MapInitialFit pickup={pickup} dropoff={dropoff} />
            <MapFlyToPickup pickup={pickup} recenterTick={recenterTick} />
          </>
        )}
        {linePickupToDropoff ? (
          <Polyline
            positions={linePickupToDropoff}
            pathOptions={{ color: '#5C2D8E', weight: 4, opacity: 0.55, dashArray: '10 8' }}
          />
        ) : null}
        {lineDriverToPickup ? (
          <Polyline
            positions={lineDriverToPickup}
            pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.65 }}
          />
        ) : null}
        {!readOnly ? <MapClickLayer mode={mapMode} onPick={onPick} /> : null}
        {captainMarkers.map((p) => (
          <Marker
            key={p.key}
            position={[p.lat, p.lng]}
            icon={carIcon({ headingDeg: p.heading, color: '#2563eb' })}
          />
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
