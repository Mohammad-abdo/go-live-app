import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Banknote, Clock, LocateFixed, MapPin, Search, TicketPercent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import TripLiveMap from '@/components/map/TripLiveMap'
import * as driver from '@/services/driverService'
import { getErrorMessage } from '@/lib/apiResponse'
import { connectDriverAvailableRidesSocket } from '@/lib/rideSocket'
import { getDriverUserIdFromSession } from '@/lib/sessionTokens'
import { useGeoWatch } from '@/lib/useGeoWatch'
import { cn } from '@/lib/utils'

const ink = 'text-[#0A0C0F]'
const muted = 'text-[#52627A]'

const origin = String(import.meta.env.VITE_API_ORIGIN || '')
  .trim()
  .replace(/\/$/, '')

function resolveMedia(src) {
  if (!src || typeof src !== 'string') return null
  const s = src.trim()
  if (!s) return null
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.startsWith('//')) return `https:${s}`
  if (!origin) return s.startsWith('/') ? s : `/${s}`
  return `${origin}${s.startsWith('/') ? '' : '/'}${s.replace(/^\//, '')}`
}

function formatMoney(n, currency) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const cur = currency || 'ج.م'
  try {
    return `${Number(n).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ${cur}`
  } catch {
    return `${n} ${cur}`
  }
}

function shortPlace(addr) {
  if (!addr) return '—'
  const first = addr.split(/[,،]/)[0]?.trim()
  return first || addr
}

/** Backend may return `estimatedPrice` as a number or `{ estimatedTotal }`. */
function numericEstimatedFare(est) {
  if (est == null) return null
  if (typeof est === 'object' && est.estimatedTotal != null) return Number(est.estimatedTotal)
  const n = Number(est)
  return Number.isFinite(n) ? n : null
}

function displayTripFare(pricing) {
  if (!pricing) return null
  const fromEst = numericEstimatedFare(pricing.estimatedPrice)
  if (fromEst != null && fromEst > 0) return fromEst
  const t = pricing.totalAmount
  if (t != null && Number(t) > 0) return Number(t)
  return null
}

/** Optional client radius (km) for GET …/rides/available — matches backend `radius` (max 100). */
const CLIENT_RADIUS_KM = (() => {
  const v = parseFloat(String(import.meta.env.VITE_DRIVER_AVAILABLE_RIDES_RADIUS_KM || '').trim())
  return Number.isFinite(v) && v >= 1 ? Math.min(100, v) : 25
})()

function readGeolocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 20_000, timeout: 12_000 },
    )
  })
}

function Pill({ children, className }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full border border-[#F4F4F4] bg-white px-1.5 text-[12px] font-medium text-[#161551]',
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * شاشة الكابتن الرئيسية — مطابقة Figma (Driver Version → Home online `147:6164`):
 * خريطة، بطاقة التوفر + إحصائيات، طلبات كبطاقات سفلية.
 * @see FIGMA_DRIVER_DESIGN in `@/lib/figma_images_for_app`
 */
export default function DriverHome() {
  const navigate = useNavigate()
  const [manualCoords, setManualCoords] = useState(null)
  const [locBusy, setLocBusy] = useState(false)
  const [online, setOnline] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [rides, setRides] = useState([])
  const [blockMsg, setBlockMsg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionId, setActionId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ratingSummary, setRatingSummary] = useState({ averageRating: 0 })
  const [searchRadiusKm, setSearchRadiusKm] = useState(null)
  const [negotiatingRides, setNegotiatingRides] = useState([])
  const [negotiateId, setNegotiateId] = useState(null)
  const [negotiateAmount, setNegotiateAmount] = useState('')

  const { pos: livePos } = useGeoWatch({
    enabled: true,
    highAccuracy: true,
    minIntervalMs: 3500,
    maxAgeMs: 10_000,
    timeoutMs: 12_000,
  })

  const coords = useMemo(() => {
    if (livePos) return { lat: livePos.lat, lng: livePos.lng }
    if (manualCoords) return manualCoords
    const pLat = Number(profile?.latitude)
    const pLng = Number(profile?.longitude)
    if (Number.isFinite(pLat) && Number.isFinite(pLng)) return { lat: pLat, lng: pLng }
    return null
  }, [livePos, manualCoords, profile?.latitude, profile?.longitude])

  const loadStatus = useCallback(async () => {
    try {
      const s = await driver.getMyStatus()
      setOnline(Boolean(s?.isOnline))
    } catch {
      setOnline(false)
    }
  }, [])

  const loadNegotiating = useCallback(async () => {
    try {
      const rows = await driver.getMyRides({ status: 'negotiating', per_page: 8, page: 1 })
      setNegotiatingRides(Array.isArray(rows) ? rows : [])
    } catch {
      setNegotiatingRides([])
    }
  }, [])

  const loadDashboard = useCallback(async () => {
    try {
      const p = await driver.getDriverProfile()
      setProfile(p && typeof p === 'object' ? p : null)
    } catch {
      setProfile(null)
    }
    try {
      const s = await driver.getDriverRatingsSummary()
      setRatingSummary(s && typeof s === 'object' ? s : { averageRating: 0 })
    } catch {
      setRatingSummary({ averageRating: 0 })
    }
    await loadNegotiating()
  }, [loadNegotiating])

  const heading = livePos?.heading
  const fetchNearby = useCallback(async () => {
    try {
      if (online && coords) {
        await driver
          .updateDriverLocation({
            latitude: coords.lat,
            longitude: coords.lng,
            ...(heading != null ? { currentHeading: heading } : {}),
          })
          .catch(() => {})
      }
      // Send coords if available; backend will still return rides even without them
      const params = { radius: CLIENT_RADIUS_KM }
      if (coords) {
        params.latitude = coords.lat
        params.longitude = coords.lng
      }
      const pack = await driver.getAvailableRides(params)
      if (pack?.searchRadius != null) setSearchRadiusKm(Number(pack.searchRadius))
      if (pack?.isDriverBlocked) {
        setBlockMsg(pack.blockMessage || 'تم تقييد عرض الطلبات الجديدة مؤقتاً.')
        setRides([])
        return
      }
      setBlockMsg(null)
      const list = Array.isArray(pack?.rides)
        ? pack.rides
        : Array.isArray(pack?.availableRides)
          ? pack.availableRides
          : []
      setRides(list)
      await loadNegotiating()
    } catch (e) {
      toast.error(getErrorMessage(e))
      setRides([])
    }
  }, [coords, loadNegotiating, online, heading])

  const fetchNearbyRef = useRef(fetchNearby)
  useEffect(() => {
    fetchNearbyRef.current = fetchNearby
  }, [fetchNearby])

  useEffect(() => {
    const driverId = getDriverUserIdFromSession()
    if (!driverId) return undefined
    return connectDriverAvailableRidesSocket({
      driverId,
      onPendingBookingCancelled: (payload) => {
        const rid = payload?.rideRequestId ?? payload?.booking_id
        if (rid != null) {
          setRides((prev) => prev.filter((r) => Number(r.id) !== Number(rid)))
        }
        fetchNearbyRef.current?.().catch(() => {})
      },
    })
  }, [])

  useEffect(() => {
    loadStatus()
    loadDashboard()
  }, [loadStatus, loadDashboard])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await fetchNearby()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  // Re-run when coords changes (GPS acquired) or fetchNearby dep changes
  }, [coords, fetchNearby])

  useEffect(() => {
    const ms = online ? 8000 : 25000
    const t = setInterval(() => {
      fetchNearby().catch(() => {})
    }, ms)
    return () => clearInterval(t)
  }, [fetchNearby, online])

  const onLocate = useCallback(async () => {
    setLocBusy(true)
    try {
      const c = await readGeolocation()
      if (!c) {
        toast.message('فعّل الموقع في المتصفح لعرض الطلبات القريبة.')
        return
      }
      setManualCoords(c)
      toast.success('تم تحديث موقعك')
    } finally {
      setLocBusy(false)
    }
  }, [])

  useEffect(() => {
    if (!coords) onLocate()
  }, [coords, onLocate])

  const onToggleOnline = async () => {
    setStatusBusy(true)
    try {
      const r = await driver.goOnlineOffline()
      setOnline(Boolean(r?.isOnline))
      toast.success(r?.isOnline ? 'أنت الآن متاح' : 'أنت الآن غير متاح')
      await loadStatus()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setStatusBusy(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Safety net: never show finished rides in “available” list even if API misbehaves.
    const activeOnly = (Array.isArray(rides) ? rides : []).filter(
      (r) => !new Set(['completed', 'cancelled', 'arrived', 'started', 'accepted']).has(String(r?.status || '')),
    )
    if (!q) return activeOnly
    return activeOnly.filter((r) => {
      const a = `${r.pickup?.address || ''} ${r.dropoff?.address || ''} ${r.rider?.name || ''}`.toLowerCase()
      return a.includes(q)
    })
  }, [rides, query])

  const acceptRide = async (id) => {
    setActionId(id)
    try {
      await driver.respondToRide({ rideRequestId: id, accept: true })
      toast.success('تم قبول الرحلة')
      await fetchNearby()
      navigate(`/app/trip/${id}`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const openNegotiate = (r) => {
    setNegotiateId(r.id)
    const base = displayTripFare(r.pricing)
    setNegotiateAmount(base != null && base > 0 ? String(Math.max(1, Math.round(base - 1))) : '')
  }

  const submitNegotiate = async () => {
    if (!negotiateId) return
    const v = parseFloat(String(negotiateAmount).replace(',', '.'))
    if (!Number.isFinite(v) || v <= 0) {
      toast.error('أدخل مبلغاً صالحاً (يجب أن يختلف عن سعر الراكب ليُرسل كعرض).')
      return
    }
    setActionId(negotiateId)
    try {
      await driver.respondToRide({ rideRequestId: negotiateId, accept: true, proposedFare: v })
      toast.success('تم إرسال عرض السعر للراكب')
      setNegotiateId(null)
      setNegotiateAmount('')
      await fetchNearby()
      await loadNegotiating()
      navigate(`/app/driver/negotiation/${negotiateId}`, { replace: false })
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const submitReject = async () => {
    if (!rejectId) return
    setActionId(rejectId)
    try {
      await driver.respondToRide({
        rideRequestId: rejectId,
        accept: false,
        rejectReason: rejectReason.trim() || 'غير متاح',
      })
      toast.success('تم الرفض')
      setRejectId(null)
      setRejectReason('')
      await fetchNearby()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const onPullRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchNearby(), loadDashboard()])
    } finally {
      setRefreshing(false)
    }
  }

  const stats = profile?.stats
  const walletCur = profile?.wallet?.currency
  const ratingLabel =
    ratingSummary?.averageRating != null && Number(ratingSummary.averageRating) > 0
      ? Number(ratingSummary.averageRating).toFixed(1)
      : '—'
  const earningsLabel = formatMoney(stats?.totalEarnings, walletCur)
  const tripsLabel = stats?.completedRides != null ? String(stats.completedRides) : stats?.totalRides != null ? String(stats.totalRides) : '—'

  return (
    <div
      dir="rtl"
      className="relative isolate min-h-[calc(100svh-env(safe-area-inset-bottom,0px))] overflow-hidden bg-[#fafafa]"
    >
      {coords ? (
        <TripLiveMap
          className="pointer-events-auto absolute inset-0 z-0 min-h-[inherit] opacity-[0.92]"
          pickup={{ lat: coords.lat, lng: coords.lng }}
          dropoff={null}
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-[#dfe3ea]" aria-hidden />
      )}

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/[0.12] via-transparent to-black/[0.06]"
        aria-hidden
      />

      <div className="absolute inset-x-5 top-[max(5.25rem,var(--safe-top))] z-20 flex flex-col gap-2">
        <div className="rounded-[20px] bg-white p-2.5 shadow-[0_8px_28px_rgba(10,12,15,0.08)]">
          <button
            type="button"
            disabled={statusBusy}
            onClick={onToggleOnline}
            className="flex w-full items-center justify-between gap-3 py-0.5"
            aria-pressed={online}
          >
            <span className="text-sm font-medium text-[#111827]">{online ? 'متاح' : 'غير متاح'}</span>
            <div
              className={cn(
                'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                online ? 'bg-primary' : 'bg-[#E0E4EB]',
              )}
            >
              <span
                className="absolute top-0.5 size-4 rounded-full bg-white shadow-[0_2px_4px_rgba(39,39,39,0.1)] transition-all"
                style={{ left: online ? 18 : 2 }}
              />
            </div>
          </button>

          <div className="mt-2.5 flex items-stretch justify-between rounded-[20px] border border-black/[0.05] bg-white p-1">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 text-center text-[#292d32]">
              <p className="text-base font-semibold tabular-nums leading-7">{ratingLabel}</p>
              <p className="text-sm leading-4 text-[#292d32]">التقييم</p>
            </div>
            <div className="my-1 w-px shrink-0 bg-[#E8EAEF]" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 text-center">
              <p className="text-base font-semibold tabular-nums leading-7 text-primary">{earningsLabel}</p>
              <p className="text-sm leading-snug text-[#292d32]">الأرباح</p>
            </div>
            <div className="my-1 w-px shrink-0 bg-[#E8EAEF]" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 text-center text-[#292d32]">
              <p className="text-base font-semibold tabular-nums leading-7">{tripsLabel}</p>
              <p className="text-sm leading-snug">رحلة</p>
            </div>
          </div>

          <div className="pointer-events-auto mt-2 flex items-center gap-2 rounded-2xl border border-[#F0F2F5] bg-[#FAFBFC] px-2 py-1.5">
            <Search className="size-4 shrink-0 text-[#8595AD]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث…"
              className="h-8 border-0 bg-transparent p-0 text-end text-xs shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        {blockMsg ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-center text-xs text-amber-950 shadow-sm backdrop-blur-sm">
            {blockMsg}
          </div>
        ) : null}

        {negotiatingRides.length ? (
          <div className="pointer-events-auto rounded-2xl border border-primary/30 bg-primary/[0.07] px-3 py-2 text-end shadow-sm backdrop-blur-sm">
            <p className="text-xs font-bold text-primary">مفاوضة سعر قيد الانتظار</p>
            <ul className="mt-1 space-y-1">
              {negotiatingRides.map((nr) => (
                <li key={nr.id}>
                  <Link
                    className="text-sm font-semibold text-ink underline-offset-2 hover:underline"
                    to={`/app/driver/negotiation/${nr.id}`}
                  >
                    رحلة #{nr.id} — متابعة التفاوض
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {coords && online && searchRadiusKm != null ? (
          <p className="pointer-events-none text-center text-[10px] leading-snug text-[#52627A]">
            البحث عن طلبات ضمن نحو {searchRadiusKm} كم من موقعك الحالي (يمكن تغيير المسافة عبر VITE_DRIVER_AVAILABLE_RIDES_RADIUS_KM).
          </p>
        ) : null}
      </div>

      {!loading && !coords ? (
        <div className="absolute inset-x-5 top-1/2 z-20 -translate-y-1/2 rounded-[22px] border border-[#E8EAEF] bg-white/95 p-5 text-center shadow-lg backdrop-blur-md">
          <MapPin className="mx-auto mb-2 size-10 text-primary" />
          <p className={cn('font-bold', ink)}>الموقع مطلوب</p>
          <p className={cn('mt-1 text-sm', muted)}>اسمح بالوصول للموقع لعرض الطلبات القريبة منك.</p>
          <Button className="mt-4 w-full rounded-xl" type="button" onClick={onLocate} disabled={locBusy}>
            تفعيل الموقع
          </Button>
        </div>
      ) : null}

      {coords && !online ? (
        <div className="pointer-events-none absolute start-1/2 top-[42%] z-[18] w-[min(22rem,calc(100%-2.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-[20px] bg-white/95 p-4 text-center shadow-[0_12px_40px_rgba(10,12,15,0.12)] backdrop-blur-md">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-[#F0F2F5] text-primary">
            <MapPin className="size-5" />
          </div>
          <p className="text-sm font-bold text-[#111827]">أنت غير متاح الآن</p>
          <p className="mt-1 text-xs leading-relaxed text-[#52627A]">
            قم بتفعيل التوفر لاستقبال طلبات جديدة والبدء في العمل.
          </p>
        </div>
      ) : null}

      <div className="pointer-events-auto absolute inset-x-5 bottom-[max(5.5rem,env(safe-area-inset-bottom,0px))] z-20 flex max-h-[min(52vh,28rem)] flex-col gap-2 overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-full bg-white/90 px-2 text-xs font-bold text-primary shadow-sm backdrop-blur-sm"
            onClick={onPullRefresh}
            disabled={refreshing || !coords}
          >
            {refreshing ? '…' : 'تحديث'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-full bg-white/90 px-2 text-xs font-bold text-primary shadow-sm backdrop-blur-sm"
            disabled={locBusy}
            onClick={onLocate}
          >
            <LocateFixed className="size-3.5" />
          </Button>
        </div>

        {loading ? (
          <p className="rounded-2xl bg-white/90 py-4 text-center text-sm text-[#52627A] shadow-sm backdrop-blur-sm">جاري التحميل…</p>
        ) : null}

        {!loading && coords && online && !filtered.length ? (
          <div className={cn('space-y-1 rounded-2xl bg-white/90 px-3 py-4 text-center text-sm shadow-sm backdrop-blur-sm', muted)}>
            <p>لا توجد طلبات جديدة ضمن نطاق البحث حالياً.</p>
            <p className="text-xs leading-relaxed text-[#8595AD]">
              تأكد أن الراكب أنشأ الطلب وأن نقطة الانطلاق على الخريطة قريبة من موقعك (GPS)، أو زِد نطاق البحث في الإعدادات.
            </p>
          </div>
        ) : null}

        {online
          ? filtered.map((r) => {
              const fareNum = displayTripFare(r.pricing)
              const fareStr = fareNum != null ? `${fareNum}` : '—'
              const km = r.distance != null ? `${r.distance} km` : r.pricing?.distance != null ? `${r.pricing.distance} km` : null
              const pay = r.pricing?.paymentType === 'cash' ? 'كاش' : r.pricing?.paymentType === 'wallet' ? 'محفظة' : 'دفع'
              const durMin = r.pricing?.duration != null ? Math.max(1, Math.round(Number(r.pricing.duration))) : null
              const estN = numericEstimatedFare(r.pricing?.estimatedPrice)
              const totN = r.pricing?.totalAmount != null ? Number(r.pricing.totalAmount) : null
              const showDiscount =
                estN != null && totN != null && estN > 0 && totN > 0 && estN < totN * 0.99
              const avatarUrl = resolveMedia(r.rider?.avatar)
              const pickShort = shortPlace(r.pickup?.address)
              const dropShort = shortPlace(r.dropoff?.address)
              const dropFull = r.dropoff?.address || ''
              return (
                <article
                  key={r.id}
                  className="rounded-[20px] border border-[#E4E4E4] border-t bg-white p-2.5 shadow-[0_8px_28px_rgba(10,12,15,0.08)]"
                >
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {r.isScheduled ? (
                      <Pill>
                        <Clock className="size-3.5 shrink-0 opacity-80" />
                        مجدولة
                      </Pill>
                    ) : null}
                    {durMin ? (
                      <Pill>
                        <Clock className="size-3.5 shrink-0 opacity-80" />
                        {durMin} دقيقة
                      </Pill>
                    ) : null}
                    <Pill>
                      <Banknote className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      {pay}
                    </Pill>
                    {showDiscount ? (
                      <Pill>
                        <TicketPercent className="size-3.5 shrink-0 opacity-80" aria-hidden />
                        مخفضة
                      </Pill>
                    ) : null}
                  </div>

                  <div className="my-2 h-px w-full bg-[#F0F2F5]" />

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 text-center">
                      <p className="text-lg font-semibold text-primary">{fareStr}</p>
                      {km ? <p className="text-sm text-[#bec2ce]">{km}</p> : null}
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="min-w-0 text-end">
                        <p className="truncate text-base font-medium text-[#111827]">{r.rider?.name || 'الراكب'}</p>
                        {r.rider?.rating ? (
                          <p className="mt-0.5 text-sm text-[#6b7280]">
                            <span className="tabular-nums">{r.rider.rating}</span>
                            <span className="ms-0.5 text-amber-500">★</span>
                          </p>
                        ) : null}
                      </div>
                      <div className="size-11 shrink-0 overflow-hidden rounded-full bg-[#E8EAEF] ring-2 ring-white">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-xs font-bold text-[#8595AD]">
                            {(r.rider?.name || '؟').charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="my-2 h-px w-full bg-[#F0F2F5]" />

                  <div className="space-y-2 text-end">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm text-[#999]">{pickShort}</p>
                      <div className="flex shrink-0 items-center gap-1 text-sm text-[#999]">
                        <span>من</span>
                        <span className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm text-[#999]">{dropShort}</p>
                        <div className="flex shrink-0 items-center gap-1 text-sm text-[#999]">
                          <span>إلى</span>
                          <span className="size-2 rounded-full bg-red-500 ring-2 ring-red-100" />
                        </div>
                      </div>
                      {dropFull && dropFull !== dropShort ? (
                        <p className="mt-1 text-sm leading-relaxed text-[#999]">{dropFull}</p>
                      ) : null}
                    </div>
                  </div>

                  <div dir="ltr" className="mt-3 flex flex-col gap-2">
                    <div className="flex gap-2.5">
                      <Button
                        type="button"
                        className="h-12 flex-1 rounded-[50px] bg-primary font-medium text-[#efeaf4] shadow-sm hover:bg-primary-hover"
                        disabled={actionId === r.id}
                        onClick={() => acceptRide(r.id)}
                      >
                        قبول
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-12 flex-1 rounded-[50px] border-0 bg-[#F0F2F5] font-medium text-[#8595ad] hover:bg-[#e8eaef]"
                        disabled={actionId === r.id}
                        onClick={() => setRejectId(r.id)}
                      >
                        رفض
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full rounded-[50px] border-primary/40 text-sm font-semibold text-primary"
                      disabled={actionId === r.id}
                      onClick={() => openNegotiate(r)}
                    >
                      اقتراح سعر مختلف (تفاوض)
                    </Button>
                  </div>
                </article>
              )
            })
          : null}
      </div>

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-[25] bg-gradient-to-t from-black/55 via-black/25 to-transparent pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-10">
        <div className="flex justify-center gap-8 pb-1 text-sm font-semibold text-white/95 drop-shadow">
          <Link to="/app/trips" className="underline-offset-2 hover:underline">
            رحلاتي
          </Link>
          <Link to="/app/account" className="underline-offset-2 hover:underline">
            حسابي
          </Link>
        </div>
      </div>

      {negotiateId ? (
        <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/45 p-4" role="dialog">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-end text-base font-black text-ink">عرض سعر للراكب</p>
            <p className={cn('mt-1 text-end text-xs', muted)}>يجب أن يختلف المبلغ عن سعر الطلب الحالي ليُرسل كعرض تفاوض.</p>
            <Input
              value={negotiateAmount}
              onChange={(e) => setNegotiateAmount(e.target.value)}
              placeholder="المبلغ المقترح (ج.م)"
              className="mt-3 h-11 rounded-xl text-end"
              dir="ltr"
              inputMode="decimal"
            />
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setNegotiateId(null)}>
                إلغاء
              </Button>
              <Button type="button" className="flex-1 rounded-xl" disabled={actionId === negotiateId} onClick={submitNegotiate}>
                إرسال العرض
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectId ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4" role="dialog">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-end text-base font-black text-ink">سبب الرفض</p>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="اختياري"
              className="mt-3 h-11 rounded-xl text-end"
              dir="rtl"
            />
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setRejectId(null)}>
                إلغاء
              </Button>
              <Button type="button" variant="destructive" className="flex-1 rounded-xl" disabled={actionId === rejectId} onClick={submitReject}>
                تأكيد الرفض
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
