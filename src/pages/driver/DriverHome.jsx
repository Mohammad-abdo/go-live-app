import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { LocateFixed, MapPin, Search, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GoLogoMark } from '@/components/branding/GoLogoMark'
import * as driver from '@/services/driverService'
import { getErrorMessage } from '@/lib/apiResponse'
import { cn } from '@/lib/utils'

const ink = 'text-[#0A0C0F]'
const muted = 'text-[#52627A]'

function formatRideDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ar-EG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
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

/**
 * شاشة الكابتن الرئيسية — طلبات قريبة (Figma: Driver Version → Home).
 * متصلة بـ GET /apimobile/driver/rides/available و POST …/respond و…/status/go-online.
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

  const loadStatus = useCallback(async () => {
    try {
      const s = await driver.getMyStatus()
      setOnline(Boolean(s?.isOnline))
    } catch {
      setOnline(false)
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
      const list = Array.isArray(pack?.rides) ? pack.rides : []
      setRides(list)
    } catch (e) {
      toast.error(getErrorMessage(e))
      setRides([])
    }
  }, [coords])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

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
      toast.success(r?.isOnline ? 'أنت الآن متصل — ستظهر الطلبات عند توفر الموقع' : 'أنت الآن غير متصل')
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
      await fetchNearby()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div dir="rtl" className="flex min-h-[calc(100svh-env(safe-area-inset-bottom,0px))] flex-col bg-[#F4F6FA]">
      <header className="sticky top-0 z-20 border-b border-[#E8EAEF] bg-white/95 px-4 pb-3 pt-[max(0.5rem,var(--safe-top))] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <GoLogoMark size="sm" className="shrink-0 text-primary" />
            <div className="min-w-0">
              <p className={cn('truncate text-base font-black', ink)}>طلبات بالقرب منك</p>
              <p className={cn('truncate text-[11px] font-medium', muted)}>
                {online ? 'متصل — يتم تحديث القائمة تلقائياً' : 'غير متصل — لن تُحمّل الطلبات الجديدة'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={statusBusy}
            onClick={onToggleOnline}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E8EAEF] bg-white px-3 py-2 shadow-sm"
            aria-pressed={online}
          >
            {online ? (
              <ToggleRight className="size-7 text-primary" strokeWidth={2} />
            ) : (
              <ToggleLeft className="size-7 text-[#8595AD]" strokeWidth={2} />
            )}
            <span className="text-xs font-bold text-ink">{online ? 'متصل' : 'غير متصل'}</span>
          </button>
        </div>
      </header>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-2xl border border-[#E8EAEF] bg-white px-3 py-2 shadow-sm">
          <Search className="size-5 shrink-0 text-[#8595AD]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث في العناوين أو اسم الراكب…"
            className="h-10 border-0 bg-transparent text-end text-sm shadow-none focus-visible:ring-0"
          />
          <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">الكل</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2">
        <Button type="button" variant="outline" size="sm" className="rounded-xl border-[#E0E4EB]" disabled={locBusy} onClick={onLocate}>
          <LocateFixed className="ms-1 size-4" />
          {locBusy ? 'جاري الموقع…' : 'تحديث الموقع'}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="rounded-xl text-primary" onClick={onPullRefresh} disabled={refreshing || !coords}>
          {refreshing ? 'جاري التحديث…' : 'تحديث القائمة'}
        </Button>
      </div>

      {blockMsg ? (
        <div className="mx-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-center text-sm text-amber-950">{blockMsg}</div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-28">
        {loading ? <p className={cn('py-10 text-center text-sm', muted)}>جاري التحميل…</p> : null}

        {!loading && !coords ? (
          <div className="mx-auto max-w-sm rounded-[22px] border border-[#E8EAEF] bg-white p-5 text-center shadow-sm">
            <MapPin className="mx-auto mb-2 size-10 text-primary" />
            <p className={cn('font-bold', ink)}>الموقع مطلوب</p>
            <p className={cn('mt-1 text-sm', muted)}>اسمح بالوصول للموقع لعرض طلبات الرحلات القريبة منك.</p>
            <Button className="mt-4 w-full rounded-xl" type="button" onClick={onLocate} disabled={locBusy}>
              تفعيل الموقع
            </Button>
          </div>
        ) : null}

        {!loading && coords && !filtered.length ? (
          <p className={cn('py-10 text-center text-sm', muted)}>لا توجد طلبات متاحة في نطاقك حالياً.</p>
        ) : null}

        {filtered.map((r) => {
          const fare = r.pricing?.totalAmount ?? r.pricing?.estimatedPrice
          return (
            <article
              key={r.id}
              className="overflow-hidden rounded-[20px] border border-[#EEF0F4] bg-white shadow-[0_8px_28px_rgba(10,12,15,0.06)]"
            >
              <div className="flex items-center justify-between border-b border-[#F0F2F5] px-3 py-2.5">
                <div className="flex items-center gap-1.5 font-black tabular-nums text-primary">
                  <span className="text-lg">{fare != null ? `${fare}` : '—'}</span>
                  <span className="text-xs font-bold text-[#52627A]">ج.م</span>
                </div>
                <p className={cn('text-xs font-semibold', muted)}>{formatRideDate(r.createdAt)}</p>
              </div>
              <div className="space-y-2 px-3 py-3">
                <div className="flex gap-2">
                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                  <div className="min-w-0 flex-1 text-end">
                    <p className="text-[11px] font-bold text-primary">من</p>
                    <p className={cn('text-sm font-semibold leading-snug', ink)}>{r.pickup?.address || '—'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-red-500 ring-2 ring-red-100" />
                  <div className="min-w-0 flex-1 text-end">
                    <p className="text-[11px] font-bold text-red-600">إلى</p>
                    <p className={cn('text-sm font-semibold leading-snug', ink)}>{r.dropoff?.address || '—'}</p>
                  </div>
                </div>
                {r.rider?.name ? (
                  <p className={cn('border-t border-[#F4F6FA] pt-2 text-end text-xs', muted)}>
                    الراكب: <span className="font-bold text-ink">{r.rider.name}</span>
                    {r.rider.rating ? (
                      <span className="ms-2 tabular-nums text-amber-700">★ {r.rider.rating}</span>
                    ) : null}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2 border-t border-[#F0F2F5] bg-[#FAFBFC] px-3 py-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-xl border-[#E0E4EB] font-bold"
                  disabled={actionId === r.id}
                  onClick={() => setRejectId(r.id)}
                >
                  رفض
                </Button>
                <Button
                  type="button"
                  className="h-11 flex-1 rounded-xl font-black shadow-md"
                  disabled={actionId === r.id}
                  onClick={() => acceptRide(r.id)}
                >
                  قبول
                </Button>
              </div>
            </article>
          )
        })}
      </div>

      <div className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md justify-center gap-3 px-4">
        <Button asChild variant="secondary" className="h-12 flex-1 rounded-2xl font-bold shadow-md">
          <Link to="/app/trips">رحلاتي</Link>
        </Button>
        <Button asChild className="h-12 flex-1 rounded-2xl font-black shadow-md">
          <Link to="/app/account">حسابي</Link>
        </Button>
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
