import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight, MessageSquareText, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TripLiveMap from '@/components/map/TripLiveMap'
import { getErrorMessage } from '@/lib/apiResponse'
import * as driver from '@/services/driverService'
import { useGeoWatch } from '@/lib/useGeoWatch'
import LiveTripSheet from '@/components/app/LiveTripSheet'
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

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function statusAr(s) {
  const m = {
    pending: 'قيد الانتظار',
    negotiating: 'انتظار رد الراكب على السعر',
    accepted: 'متجه للراكب',
    arrived: 'وصلت لنقطة الالتقاء',
    started: 'الرحلة جارية',
    in_progress: 'الرحلة جارية',
    ongoing: 'الرحلة جارية',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
    searching: 'جاري البحث',
  }
  return m[s] || s || '—'
}

function shortPlace(addr) {
  if (!addr) return '—'
  const first = addr.split(/[,،]/)[0]?.trim()
  return first || addr
}

function etaLine(status, durationMin) {
  if (status === 'accepted' && durationMin != null && durationMin > 0) {
    return `ستصل في خلال ~ ${durationMin} دقيقة`
  }
  if (status === 'accepted') return 'في الطريق إلى نقطة الالتقاء'
  if (status === 'arrived') return 'في انتظار بدء الرحلة مع الراكب'
  if (status === 'started' || status === 'in_progress' || status === 'ongoing') return 'أنت في الطريق إلى الوجهة'
  return statusAr(status)
}

/**
 * شاشة رحلة الكابتن — Figma Driver Version → Home `166:1165` (خريطة + بطاقة سفلية).
 */
export default function DriverActiveTrip() {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const [ride, setRide] = useState(null)
  const [loadErr, setLoadErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [sentOnce, setSentOnce] = useState(false)

  const rideStatus = String(ride?.status || '')
  const rideIsLive = Boolean(rideId) && ride && !['completed', 'cancelled'].includes(rideStatus)
  const geoEnabled = rideIsLive

  const { pos: myPos } = useGeoWatch({
    enabled: geoEnabled,
    highAccuracy: true,
    minIntervalMs: 2500,
    maxAgeMs: 5_000,
    timeoutMs: 12_000,
  })

  const lastSendRef = useRef(0)

  const load = useCallback(async () => {
    if (!rideId) return
    try {
      const r = await driver.getRideDetail(rideId)
      setRide(r && typeof r === 'object' ? r : null)
      setLoadErr(null)
    } catch (e) {
      setLoadErr(getErrorMessage(e))
      setRide(null)
    }
  }, [rideId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!rideId) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [rideId, load])

  useEffect(() => {
    if (!rideIsLive) return
    if (!myPos) return
    const now = Date.now()
    if (lastSendRef.current && now - lastSendRef.current < 2500) return
    lastSendRef.current = now
    const payload = {
      latitude: myPos.lat,
      longitude: myPos.lng,
      ...(myPos.heading != null ? { currentHeading: myPos.heading } : {}),
    }
    driver
      .updateDriverLocation(payload)
      .then(() => {
        if (!sentOnce) setSentOnce(true)
      })
      .catch(() => {})
  }, [myPos, rideIsLive, sentOnce])

  const pickup = useMemo(() => {
    if (!ride) return null
    const lat = num(ride.startLatitude)
    const lng = num(ride.startLongitude)
    if (lat == null || lng == null) return null
    return { lat, lng, address: ride.startAddress || '' }
  }, [ride])

  const dropoff = useMemo(() => {
    if (!ride) return null
    const lat = num(ride.endLatitude)
    const lng = num(ride.endLongitude)
    if (lat == null || lng == null) return null
    return { lat, lng, address: ride.endAddress || '' }
  }, [ride])

  const rider = ride?.rider
  const name = rider ? `${rider.firstName || ''} ${rider.lastName || ''}`.trim() : 'الراكب'
  const tel = rider?.contactNumber ? String(rider.contactNumber).replace(/\s/g, '') : ''
  const avatarUrl = resolveMedia(rider?.avatar)

  const onArrived = async () => {
    if (!rideId) return
    setBusy(true)
    try {
      await driver.updateRideStatus({ rideRequestId: rideId, status: 'arrived' })
      toast.success('تم تسجيل الوصول')
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const onStarted = async () => {
    if (!rideId) return
    setBusy(true)
    try {
      await driver.updateRideStatus({ rideRequestId: rideId, status: 'started' })
      toast.success('تم بدء الرحلة')
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const onComplete = async () => {
    if (!rideId) return
    setBusy(true)
    try {
      await driver.completeRide({ rideRequestId: rideId })
      toast.success('تم إنهاء الرحلة')
      await load()
      navigate('/app/trips', { replace: true })
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const onCancel = async () => {
    if (!rideId) return
    setBusy(true)
    try {
      await driver.cancelRideDriver({ rideRequestId: rideId, reason: 'إلغاء من السائق' })
      toast.success('تم إلغاء الرحلة')
      setCancelOpen(false)
      navigate('/app/trips', { replace: true })
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (loadErr && !ride) {
    return (
      <div dir="rtl" className="mx-auto max-w-md space-y-4 py-10 text-center">
        <p className={cn('text-sm', muted)}>{loadErr}</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/app/trips">رحلاتي</Link>
        </Button>
      </div>
    )
  }

  if (!ride) {
    return <p className={cn('py-12 text-center text-sm', muted)}>جاري التحميل…</p>
  }

  const st = String(ride.status)
  const fare = ride.totalAmount
  const pay = ride.paymentType === 'cash' ? 'كاش' : ride.paymentType === 'wallet' ? 'محفظة' : ride.paymentType || '—'
  const done = st === 'completed' || st === 'cancelled'
  const negotiating = st === 'negotiating'
  const durMin = ride.duration != null ? Math.max(1, Math.round(Number(ride.duration))) : null
  const pickupShort = shortPlace(ride.startAddress)
  const driverPoint =
    myPos && Number.isFinite(Number(myPos.lat)) && Number.isFinite(Number(myPos.lng))
      ? { lat: myPos.lat, lng: myPos.lng }
      : null

  return (
    <div dir="rtl" className="relative isolate h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#fafafa]">
      <div className="absolute inset-x-0 top-0 z-0 h-[min(46vh,380px)] min-h-[200px]">
        {pickup && dropoff ? (
          <TripLiveMap className="absolute inset-0 h-full w-full" pickup={pickup} dropoff={dropoff} driver={driverPoint} />
        ) : (
          <div className="absolute inset-0 bg-[#dfe3ea]" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" aria-hidden />
      </div>

      <div className="absolute inset-x-0 bottom-0 top-[min(42vh,360px)] z-10 flex flex-col">
        <LiveTripSheet className="h-full rounded-t-[20px] bg-[#fafafa] pt-4 shadow-[0_-12px_40px_rgba(0,0,0,0.14)]">

        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            to="/app/trips"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#F4F4F4] bg-white text-primary shadow-sm"
            aria-label="رجوع"
          >
            <ChevronRight className="size-5 rtl:rotate-180" />
          </Link>
          <span className="rounded-full border border-[#F4F4F4] bg-white px-3 py-1 text-[11px] font-semibold text-[#111827]">
            {statusAr(st)}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
          {negotiating ? (
            <div className="rounded-[20px] border border-primary/30 bg-primary/[0.06] px-4 py-3 text-end">
              <p className="text-sm font-bold text-primary">التفاوض على السعر</p>
              <p className={cn('mt-1 text-xs leading-relaxed', muted)}>
                تم إرسال عرضك للراكب. عند قبوله ستتحول الرحلة إلى «مقبولة» ويمكنك المتابعة من هنا أو من «رحلاتي».
              </p>
              {ride.negotiatedFare != null ? (
                <p className="mt-2 text-sm font-semibold text-ink">عرضك: {ride.negotiatedFare} ج.م</p>
              ) : null}
            </div>
          ) : null}

          {!done && !negotiating ? (
            <div className="rounded-[20px] border border-[#f4f4f4] bg-white px-4 py-3 shadow-sm">
              <p className="text-center text-base font-semibold text-black">{etaLine(st, durMin)}</p>
              {rider ? (
                <div className="mt-4 flex items-start justify-center gap-4">
                  <div className="flex flex-1 flex-col items-center gap-2">
                    {tel ? (
                      <a
                        href={`tel:${tel}`}
                        className="flex size-12 items-center justify-center rounded-[24px] border border-primary bg-white text-primary shadow-sm"
                        aria-label="اتصال"
                      >
                        <Phone className="size-6" strokeWidth={2} />
                      </a>
                    ) : (
                      <div className="flex size-12 items-center justify-center rounded-[24px] border border-[#E8EAEF] bg-[#F0F2F5] text-[#8595AD]">
                        <Phone className="size-6" strokeWidth={2} />
                      </div>
                    )}
                    <span className="text-center text-xs font-medium text-black">التواصل مع الراكب</span>
                  </div>
                  <div className="flex flex-1 flex-col items-center gap-1">
                    <div className="relative size-12">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="size-12 rounded-full object-cover ring-2 ring-white" />
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-full bg-[#E8EAEF] text-sm font-bold text-[#8595AD] ring-2 ring-white">
                          {name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <p className="max-w-[10rem] truncate text-center text-xs font-medium text-black">{name}</p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-[20px] border border-[#f4f4f4] bg-white px-4 py-3 text-end shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 truncate text-sm text-[#999]">{pickupShort}</p>
              <div className="flex shrink-0 items-center gap-1 text-sm text-[#999]">
                <span>الركوب من</span>
                <span className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
              </div>
            </div>
            {ride.startAddress && ride.startAddress !== pickupShort ? (
              <p className="mt-2 text-sm leading-relaxed text-[#999]">{ride.startAddress}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-[50px] border border-[#f4f4f4] bg-white px-3 py-2.5 shadow-sm">
            <Link
              to={`/app/chat?rideId=${rideId}`}
              className="flex min-w-0 flex-1 items-center justify-end gap-2 text-end"
            >
              <ChevronRight className="size-[18px] shrink-0 text-primary rtl:rotate-180" />
              <span className="min-w-0 flex-1 truncate text-sm text-[#8595ad]">أضف أي ملاحظات للراكب</span>
              <MessageSquareText className="size-5 shrink-0 text-primary" />
            </Link>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#F0F2F5] bg-white px-3 py-2.5 text-sm shadow-sm">
            <span className="text-[#52627A]">{pay}</span>
            <span className={cn('font-bold tabular-nums', ink)}>{fare != null ? `${fare} ج.م` : '—'}</span>
          </div>

          {!done && !negotiating ? (
            <div className="flex flex-col gap-2 pt-1">
              {st === 'accepted' ? (
                <Button
                  type="button"
                  className="h-12 w-full rounded-[50px] bg-primary font-medium text-white shadow-sm hover:bg-primary-hover"
                  disabled={busy}
                  onClick={onArrived}
                >
                  وصلت لنقطة الالتقاء
                </Button>
              ) : null}
              {st === 'arrived' ? (
                <Button
                  type="button"
                  className="h-12 w-full rounded-[50px] bg-primary font-medium text-white shadow-sm hover:bg-primary-hover"
                  disabled={busy}
                  onClick={onStarted}
                >
                  بدء الرحلة
                </Button>
              ) : null}
              {st === 'started' || st === 'in_progress' || st === 'ongoing' ? (
                <Button
                  type="button"
                  className="h-12 w-full rounded-[50px] bg-primary font-medium text-white shadow-sm hover:bg-primary-hover"
                  disabled={busy}
                  onClick={onComplete}
                >
                  إنهاء الرحلة وتأكيد التحصيل
                </Button>
              ) : null}

              <button
                type="button"
                className="py-2 text-center text-base font-medium text-[rgba(255,0,0,0.98)] disabled:opacity-50"
                disabled={busy}
                onClick={() => setCancelOpen(true)}
              >
                إلغاء الرحلة
              </button>
            </div>
          ) : null}

          {!done && negotiating ? (
            <button
              type="button"
              className="py-2 text-center text-base font-medium text-[rgba(255,0,0,0.98)] disabled:opacity-50"
              disabled={busy}
              onClick={() => setCancelOpen(true)}
            >
              إلغاء الرحلة
            </button>
          ) : null}

          {done ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-900">انتهت هذه الرحلة.</p> : null}
          {!done ? (
            <p className="text-center text-[10px] leading-tight text-[#B8C0CC]">
              {sentOnce ? <span className="text-emerald-600">● إرسال موقعك قيد التشغيل</span> : <span>تجهيز تتبع GPS…</span>}
            </p>
          ) : null}
        </div>
        </LiveTripSheet>
      </div>

      {cancelOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-4" role="dialog">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-end text-base font-bold text-ink">إلغاء الرحلة؟</p>
            <p className={cn('mt-2 text-end text-sm', muted)}>سيتم إشعار الراكب وإلغاء التعيين. هل أنت متأكد؟</p>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" disabled={busy} onClick={() => setCancelOpen(false)}>
                تراجع
              </Button>
              <Button type="button" variant="destructive" className="flex-1 rounded-xl" disabled={busy} onClick={onCancel}>
                تأكيد الإلغاء
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
