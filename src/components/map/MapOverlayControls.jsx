import { LocateFixed, Minus, Plus } from 'lucide-react'
import { useMap } from 'react-leaflet'
import { cn } from '@/lib/utils'

function isFiniteNum(n) {
  return Number.isFinite(n) && !Number.isNaN(n)
}

/**
 * Minimal, mobile-friendly map controls (zoom + recenter).
 * Pure UI overlay; never changes bounds automatically.
 *
 * @param {{ className?: string, focus?: { lat: number, lng: number } | null, minZoom?: number, maxZoom?: number }} props
 */
export default function MapOverlayControls({ className, focus, minZoom = 3, maxZoom = 18 }) {
  const map = useMap()

  const onRecenter = () => {
    const lat = Number(focus?.lat)
    const lng = Number(focus?.lng)
    if (!isFiniteNum(lat) || !isFiniteNum(lng)) return
    const z = Math.max(map.getZoom(), 15)
    map.flyTo([lat, lng], z, { duration: 0.55 })
  }

  const onZoomIn = () => map.setZoom(Math.min(maxZoom, map.getZoom() + 1))
  const onZoomOut = () => map.setZoom(Math.max(minZoom, map.getZoom() - 1))

  return (
    <div className={cn('pointer-events-auto absolute end-3 top-3 z-[650] flex flex-col gap-2', className)}>
      <button
        type="button"
        onClick={onRecenter}
        className="flex size-10 items-center justify-center rounded-2xl bg-white/95 text-[#111827] shadow-[0_8px_24px_rgba(10,12,15,0.12)] ring-1 ring-black/5 backdrop-blur"
        aria-label="إعادة التمركز"
      >
        <LocateFixed className="size-5 text-primary" />
      </button>

      <div className="overflow-hidden rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(10,12,15,0.12)] ring-1 ring-black/5 backdrop-blur">
        <button
          type="button"
          onClick={onZoomIn}
          className="flex size-10 items-center justify-center text-[#111827] hover:bg-[#F4F6FA]"
          aria-label="تكبير"
        >
          <Plus className="size-5" />
        </button>
        <div className="h-px bg-[#EEF0F4]" />
        <button
          type="button"
          onClick={onZoomOut}
          className="flex size-10 items-center justify-center text-[#111827] hover:bg-[#F4F6FA]"
          aria-label="تصغير"
        >
          <Minus className="size-5" />
        </button>
      </div>
    </div>
  )
}

