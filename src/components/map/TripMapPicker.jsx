import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { cn } from '@/lib/utils'

function pinIcon(color) {
  return L.divIcon({
    className: 'go-map-pin',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.28)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function formatAddr(lat, lng) {
  return `موقع على الخريطة (${lat.toFixed(4)}, ${lng.toFixed(4)})`
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

/**
 * Interactive OSM map: tap to set pickup/dropoff (active mode), drag pins to adjust.
 */
export default function TripMapPicker({
  className,
  pickup,
  dropoff,
  mapMode,
  onPickupChange,
  onDropoffChange,
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const center = useMemo(() => {
    const midLat = (pickup.lat + dropoff.lat) / 2
    const midLng = (pickup.lng + dropoff.lng) / 2
    return [midLat, midLng]
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng])

  const onPick = useCallback(
    (mod, lat, lng) => {
      const addr = formatAddr(lat, lng)
      if (mod === 'pickup') onPickupChange({ lat, lng, address: addr })
      else onDropoffChange({ lat, lng, address: addr })
    },
    [onPickupChange, onDropoffChange],
  )

  const onPickupDragEnd = useCallback(
    (e) => {
      const m = e.target.getLatLng()
      onPickupChange({ lat: m.lat, lng: m.lng, address: formatAddr(m.lat, m.lng) })
    },
    [onPickupChange],
  )

  const onDropoffDragEnd = useCallback(
    (e) => {
      const m = e.target.getLatLng()
      onDropoffChange({ lat: m.lat, lng: m.lng, address: formatAddr(m.lat, m.lng) })
    },
    [onDropoffChange],
  )

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
        <MapClickLayer mode={mapMode} onPick={onPick} />
        <Marker
          position={[pickup.lat, pickup.lng]}
          icon={pinIcon('#34C759')}
          draggable
          eventHandlers={{ dragend: onPickupDragEnd }}
        />
        <Marker
          position={[dropoff.lat, dropoff.lng]}
          icon={pinIcon('#FF3B30')}
          draggable
          eventHandlers={{ dragend: onDropoffDragEnd }}
        />
      </MapContainer>
    </div>
  )
}
