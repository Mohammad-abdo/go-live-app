import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Banknote, Clock, LocateFixed, MapPin, Search, TicketPercent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GoLogoMark } from '@/components/branding/GoLogoMark'
import TripLiveMap from '@/components/map/TripLiveMap'
import * as driver from '@/services/driverService'
import { getErrorMessage } from '@/lib/apiResponse'
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
  const [coords, setCoords] = useState(null)
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

  const loadStatus = useCallback(async () => {
    try {
      const s = await driver.getMyStatus()
      setOnline(Boolean(s?.isOnline))
    } catch {
      setOnline(false)
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
  }, [])

  const fetchNearby = useCallback(async () => {
    if (!coords) {
      setRides([])
      setBlockMsg(null)
      return
    }
    try {
      await driver.updateDriverLocation({ latitude: coords.lat, longitude: coords.lng }).catch(() => {})
      const pack = await driver.getAvailableRides({
        latitude: coords.lat,
        longitude: coords.lng,
      })
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
    } catch (e) {
      toast.error(getErrorMessage(e))
      setRides([])
    }
  }, [coords])

  useEffect(() => {
    loadStatus()
    loadDashboard()
  }, [loadStatus, loadDashboard])

  useEffect(() => {
    if (!coords) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await fetchNearby()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [coords, fetchNearby])

  useEffect(() => {
    if (!coords) return
    const t = setInterval(() => {
      fetchNearby().catch(() => {})
    }, 28000)
    return () => clearInterval(t)
  }, [coords, fetchNearby])

  const onLocate = useCallback(async () => {
    setLocBusy(true)
    try {
      const c = await readGeolocation()
      if (!c) {
        toast.message('فعّل الموقع في المتصفح لعرض الطلبات القريبة.')
        return
      }
      setCoords(c)
      toast.success('تم تحديث موقعك')
    } finally {
      setLocBusy(false)
    }
  }, [])

  useEffect(() => {
    onLocate()
  }, [onLocate])

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
    if (!q) return rides
    return rides.filter((r) => {
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

      <div className="pointer-events-none absolute start-4 top-[max(5.25rem,var(--safe-top))] z-30">
        <GoLogoMark size="sm" className="pointer-events-none text-primary drop-shadow-sm" />
      </div>

      <div className="absolute inset-x-5 top-[max(6.5rem,var(--safe-top))] z-20 flex flex-col gap-2">
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
          <p className={cn('rounded-2xl bg-white/90 py-4 text-center text-sm shadow-sm backdrop-blur-sm', muted)}>لا توجد طلبات في نطاقك حالياً.</p>
        ) : null}

        {online
          ? filtered.map((r) => {
              const fare = r.pricing?.totalAmount ?? r.pricing?.estimatedPrice
              const fareStr = fare != null ? `${fare}` : '—'
              const km = r.distance != null ? `${r.distance} km` : r.pricing?.distance != null ? `${r.pricing.distance} km` : null
              const pay = r.pricing?.paymentType === 'cash' ? 'كاش' : r.pricing?.paymentType === 'wallet' ? 'محفظة' : 'دفع'
              const durMin = r.pricing?.duration != null ? Math.max(1, Math.round(Number(r.pricing.duration))) : null
              const est = r.pricing?.estimatedPrice
              const tot = r.pricing?.totalAmount
              const showDiscount =
                est != null && tot != null && Number(est) > 0 && Number(tot) > 0 && Number(est) < Number(tot) * 0.99
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

                  <div dir="ltr" className="mt-3 flex gap-2.5">
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
