import { useEffect, useMemo, useRef, useState } from 'react'

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function isFiniteNum(v) {
  return Number.isFinite(v) && !Number.isNaN(v)
}

/**
 * Lightweight geolocation watcher (no per-tick allocations) with throttling.
 *
 * Notes:
 * - On some Android WebViews, frequent updates can stall the UI; throttle helps.
 * - The hook is safe to enable/disable; it always cleans up watchPosition.
 */
export function useGeoWatch({
  enabled,
  highAccuracy = true,
  minIntervalMs = 2500,
  maxAgeMs = 10_000,
  timeoutMs = 12_000,
} = {}) {
  const [pos, setPos] = useState(null)
  const [error, setError] = useState(null)

  const watchIdRef = useRef(null)
  const lastEmitRef = useRef(0)
  const lastPosRef = useRef(null)
  const hadErrorRef = useRef(false)

  const options = useMemo(
    () => ({
      enableHighAccuracy: Boolean(highAccuracy),
      maximumAge: clamp(Number(maxAgeMs) || 0, 0, 120_000),
      timeout: clamp(Number(timeoutMs) || 0, 1_000, 60_000),
    }),
    [highAccuracy, maxAgeMs, timeoutMs],
  )

  useEffect(() => {
    if (!enabled) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return
    }

    lastEmitRef.current = 0
    lastPosRef.current = null

    const onOk = (p) => {
      if (hadErrorRef.current) {
        hadErrorRef.current = false
        setError(null)
      }
      const now = Date.now()
      const minInterval = clamp(Number(minIntervalMs) || 0, 250, 60_000)
      if (lastEmitRef.current && now - lastEmitRef.current < minInterval) return

      const lat = Number(p?.coords?.latitude)
      const lng = Number(p?.coords?.longitude)
      if (!isFiniteNum(lat) || !isFiniteNum(lng)) return

      const heading = Number(p?.coords?.heading)
      const next = {
        lat,
        lng,
        heading: isFiniteNum(heading) ? heading : null,
        accuracy: Number(p?.coords?.accuracy) || null,
        ts: Number(p?.timestamp) || now,
      }

      const prev = lastPosRef.current
      if (prev && prev.lat === next.lat && prev.lng === next.lng && prev.heading === next.heading) return

      lastEmitRef.current = now
      lastPosRef.current = next
      setPos(next)
    }

    const onErr = (e) => {
      hadErrorRef.current = true
      setError(e || new Error('Geolocation error'))
    }

    const id = navigator.geolocation.watchPosition(onOk, onErr, options)
    watchIdRef.current = id

    return () => {
      try {
        if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
      } catch {
        // ignore
      }
      watchIdRef.current = null
    }
  }, [enabled, minIntervalMs, options])

  return { pos, error }
}

