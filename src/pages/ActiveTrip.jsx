import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Car,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Phone,
  Share2,
  Shield,
  Siren,
  Star,
  X,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import TripLiveMap from '@/components/map/TripLiveMap'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage, unwrapData } from '@/lib/apiResponse'
import { api } from '@/lib/api'
import { connectRideTrackingSocket, resolveSocketBaseUrl } from '@/lib/rideSocket'
import * as rider from '@/services/riderService'
import { cn } from '@/lib/utils'

const ink = 'text-[#0A0C0F]'
const muted = 'text-[#52627A]'

const CANCEL_REASONS = [
  'لم أعد بحاجة إلى رحلة',
  'أريد إجراء تغييرات في الرحلة',
  'السائق لا يتحرك أو خرج عن المسار',
  'الشريك السائق متأخر',
  'يطلب الشريك السائق أجرة إضافية',
  'طلب الشريك السائق الإلغاء',
  'سيارة مختلفة',
  'مشكلة في التطبيق',
  'سبب آخر',
]

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function statusAr(s) {
  const m = {
    pending: 'قيد الانتظار',
    accepted: 'تم قبول السائق',
    arrived: 'السائق وصل',
    arrived_at_pickup: 'في نقطة الانطلاق',
    started: 'الرحلة بدأت',
    in_progress: 'جاري التنفيذ',
    ongoing: 'جاري التنفيذ',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
  }
  return m[s] || s || '—'
}

function parseServiceData(raw) {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return typeof raw === 'object' ? raw : {}
}

function statusHeadline(status, driverShortName) {
  const s = String(status)
  const d = driverShortName || 'السائق'
  if (s === 'accepted') return `السائق سيصل في خلال ~ 2 دقيقة`
  if (s === 'arrived' || s === 'arrived_at_pickup') return `وصل السائق. مدة الانتظار تُعرض أدناه`
  if (s === 'started' || s === 'in_progress' || s === 'ongoing') return `رحلتك الحالية مع ${d}`
  if (s === 'pending') return 'جاري البحث عن شريك سائق'
  return statusAr(s)
}

function statusBanner(status) {
  const s = String(status)
  if (s === 'accepted') return 'على وشك الوصول'
  if (s === 'arrived' || s === 'arrived_at_pickup') return 'في نقطة الالتقاء'
  if (s === 'started' || s === 'in_progress' || s === 'ongoing') return 'في الطريق إلى الوجهة'
  return null
}

export default function ActiveTrip() {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const role = getActiveRole()

  const [booking, setBooking] = useState(null)
  const [pulse, setPulse] = useState(null)
  const [loadErr, setLoadErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [cancelUi, setCancelUi] = useState(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [wsDriver, setWsDriver] = useState(null)
  const [socketLive, setSocketLive] = useState(false)

  const loadBooking = useCallback(async () => {
    if (!rideId) return
    try {
      const b = await rider.getBookingById(rideId)
      setBooking(b && typeof b === 'object' ? b : null)
      setLoadErr(null)
    } catch (e) {
      setLoadErr(getErrorMessage(e))
      setBooking(null)
    }
  }, [rideId])

  const pollStatus = useCallback(async () => {
    if (!rideId || role !== 'rider') return
    try {
      const d = await rider.getTripStatus(rideId)
      setPulse(d && typeof d === 'object' ? d : null)
    } catch {
      /* keep last pulse */
    }
  }, [rideId, role])

  useEffect(() => {
    loadBooking()
  }, [loadBooking])

  useEffect(() => {
    if (role !== 'rider' || !rideId) return
    pollStatus()
    const t = setInterval(pollStatus, 4000)
    return () => clearInterval(t)
  }, [role, rideId, pollStatus])

  const driverId = booking?.driver?.id
  useEffect(() => {
    if (!rideId || !driverId || role !== 'rider') return
    rider.trackDriver({ driver_id: driverId, booking_id: rideId }).catch(() => {})
  }, [rideId, driverId, role])

  const pickup = useMemo(() => {
    if (!booking) return null
    const lat = num(booking.startLatitude ?? pulse?.from?.lat)
    const lng = num(booking.startLongitude ?? pulse?.from?.lng)
    if (lat == null || lng == null) return null
    return {
      lat,
      lng,
      address: booking.startAddress || pulse?.from?.address || '',
    }
  }, [booking, pulse])

  const dropoff = useMemo(() => {
    if (!booking) return null
    const lat = num(booking.endLatitude ?? pulse?.to?.lat)
    const lng = num(booking.endLongitude ?? pulse?.to?.lng)
    if (lat == null || lng == null) return null
    return {
      lat,
      lng,
      address: booking.endAddress || pulse?.to?.address || '',
    }
  }, [booking, pulse])

  const driverPoint = useMemo(() => {
    if (wsDriver) return wsDriver
    const loc = pulse?.driverLocation
    if (!loc) return null
    const lat = num(loc.lat)
    const lng = num(loc.lng)
    if (lat == null || lng == null) return null
    return { lat, lng }
  }, [pulse, wsDriver])

  useEffect(() => {
    if (role !== 'rider' || !rideId || !driverId) return undefined
    setWsDriver(null)
    setSocketLive(false)
    const disconnect = connectRideTrackingSocket({
      rideId,
      onDriverLocation: (loc) => setWsDriver(loc),
      onConnected: () => setSocketLive(true),
      onError: () => setSocketLive(false),
    })
    return disconnect
  }, [role, rideId, driverId])

  const serviceData = useMemo(() => parseServiceData(booking?.serviceData), [booking])

  const liveStatus = pulse?.status ?? booking?.status
  const fare = pulse?.price ?? booking?.totalAmount
  const otp = pulse?.trip_code ?? booking?.otp
  const payLabel = booking?.paymentType === 'cash' ? 'نقداً' : booking?.paymentType || '—'

  const canCancel =
    booking &&
    !['completed', 'cancelled'].includes(String(booking.status)) &&
    ['pending', 'accepted', 'arrived', 'arrived_at_pickup', 'started', 'in_progress', 'ongoing'].includes(
      String(booking.status),
    )

  const canEndTrip =
    booking &&
    ['accepted', 'arrived', 'arrived_at_pickup', 'started', 'in_progress', 'ongoing'].includes(String(booking.status))

  const goRate = () => navigate(`/app/trip/${rideId}/rate`)

  const finalizeCancel = async (reasonText) => {
    if (!rideId || !booking) return
    const reason = String(reasonText || '').trim()
    setBusy(true)
    try {
      await rider.cancelTrip({
        booking_id: rideId,
        driver_id: driverId,
        reason: reason || undefined,
      })
      toast.success('تم إلغاء الرحلة')
      setCancelUi(null)
      await loadBooking()
      await pollStatus()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const onEndTrip = async () => {
    if (!rideId) return
    setBusy(true)
    try {
      await rider.tripEnd({ booking_id: rideId, driver_id: driverId })
      toast.success('تم إنهاء الرحلة — يمكنك التقييم الآن')
      await loadBooking()
      await pollStatus()
      goRate()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const onSos = async () => {
    if (!rideId) return
    setBusy(true)
    try {
      const res = await api.post('/apimobile/user/offers/sos', {
        rideRequestId: rideId,
        note: 'go-live-tester SOS',
      })
      unwrapData(res)
      toast.success('تم إرسال تنبيه SOS')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const onShareTrip = async () => {
    const title = `رحلة GO #${rideId}`
    const text = `${pickup?.address || ''} → ${dropoff?.address || ''}`
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text })
      } else {
        await navigator.clipboard?.writeText?.(`${title}\n${text}`)
        toast.message('تم نسخ تفاصيل الرحلة')
      }
    } catch (e) {
      if (e?.name !== 'AbortError') toast.error('تعذر المشاركة')
    }
  }

  if (role === 'driver') {
    return (
      <div dir="rtl" className="mx-auto max-w-md space-y-4 py-6 text-center">
        <p className={cn('text-sm', muted)}>تفاصيل رحلة الراكب تظهر من تطبيق الراكب. استخدم قائمة الرحلات ككابتن.</p>
        <Button asChild className="rounded-xl">
          <Link to="/app/trips">رحلاتي</Link>
        </Button>
      </div>
    )
  }

  if (loadErr && !booking) {
    return (
      <div dir="rtl" className="mx-auto max-w-md space-y-4 py-8 text-center">
        <XCircle className="mx-auto size-12 text-amber-600" />
        <p className={cn('text-sm', muted)}>{loadErr}</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/app/trips">السجل</Link>
        </Button>
      </div>
    )
  }

  if (!booking) {
    return <p className={cn('py-12 text-center text-sm', muted)}>جاري التحميل…</p>
  }

  const driver = booking.driver
  const firstName = driver?.firstName?.trim() || ''
  const name = driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() : 'السائق'
  const driverShort = firstName || name
  const completed = String(booking.status) === 'completed'
  const cancelled = String(booking.status) === 'cancelled'
  const showRateCta = completed && !booking.isDriverRated

  const socketHostHint = resolveSocketBaseUrl() || (import.meta.env.DEV ? 'نفس المنفذ (بروكسي)' : 'نفس الموقع')
  const vehicleLine =
    booking.shipment?.vehicleCategoryName ||
    serviceData.vehicleCategoryName ||
    serviceData.vehicleName ||
    'مركبة الرحلة'
  const plate =
    serviceData.licensePlate || serviceData.plateNumber || serviceData.plate || null
  const banner = statusBanner(liveStatus)
  const tel = driver?.contactNumber ? String(driver.contactNumber).replace(/\s/g, '') : ''

  return (
    <div
      dir="rtl"
      className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#E8EAEF] [-webkit-overflow-scrolling:touch]"
    >
      <div className="relative z-0 flex min-h-[220px] flex-[0_1_46%] basis-[44dvh] max-h-[50dvh] shrink-0 overflow-hidden">
        {pickup && dropoff ? (
          <TripLiveMap
            className="absolute inset-0 h-full min-h-[220px] w-full"
            pickup={pickup}
            dropoff={dropoff}
            driver={driverPoint}
          />
        ) : (
          <div className="absolute inset-0 bg-[#dde1e8]" />
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex items-start justify-between px-3 pt-[max(0.35rem,var(--safe-top))]">
          <Link
            to="/app/home"
            className="pointer-events-auto flex items-baseline gap-0.5 rounded-xl bg-white/92 px-3 py-1.5 shadow-md ring-1 ring-black/[0.06] backdrop-blur-sm"
          >
            <span className="text-xl font-black leading-none tracking-tight text-primary">G</span>
            <span className="relative -ms-0.5 text-xl font-black leading-none tracking-tight text-primary">
              O
              <span className="absolute inset-x-0.5 bottom-0.5 top-[42%] mx-auto h-[2px] w-[55%] rounded-full bg-primary/35" />
            </span>
          </Link>
        </div>
      </div>

      <motion.div
        layout
        initial={{ y: 12, opacity: 0.96 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="pointer-events-auto relative z-10 flex min-h-0 flex-[1_1_auto] flex-col rounded-t-[32px] bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3 shadow-[0_-16px_48px_rgba(10,12,15,0.12)]"
      >
        <div className="mx-auto mb-2 h-1 w-[42px] shrink-0 rounded-full bg-[#D5D9E2]" />

        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            to="/app/trips"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#EEF0F4] bg-white text-primary shadow-[0_2px_12px_rgba(92,45,142,0.12)]"
            aria-label="رجوع"
          >
            <ChevronRight className="size-5 rtl:rotate-180" />
          </Link>
          <span className="rounded-full bg-[#F4F6FA] px-3 py-1 text-[11px] font-semibold text-[#52627A]">
            {statusAr(liveStatus)}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-2">
          <div className="text-end">
            <h1 className={cn('text-[1.35rem] font-black leading-[1.35] tracking-tight', ink)}>
              {statusHeadline(liveStatus, driverShort)}
            </h1>
            {otp ? (
              <p className="mt-1 text-xs font-medium text-primary">
                رمز الرحلة: <span dir="ltr">{otp}</span>
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-[20px] border border-[#EEF0F4] bg-[#FAFBFC] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0F2F5] text-[#9aa3b2]">
              <Car className="size-7" aria-hidden strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 text-end">
              <p className={cn('text-[15px] font-bold leading-snug', ink)}>{vehicleLine}</p>
              {plate ? (
                <p
                  className="mt-1.5 inline-block rounded-lg bg-[#E4E7ED] px-2.5 py-1 font-mono text-[13px] font-bold tracking-wide text-ink"
                  dir="ltr"
                >
                  {plate}
                </p>
              ) : (
                <p className="mt-1.5 inline-block rounded-lg bg-[#E4E7ED] px-2.5 py-1 text-xs text-[#8595AD]">— — —</p>
              )}
            </div>
          </div>

          {banner && !cancelled && !completed ? (
            <div className="rounded-2xl bg-primary px-4 py-2.5 text-center text-[15px] font-bold text-white shadow-[0_6px_20px_rgba(92,45,142,0.35)]">
              {banner}
            </div>
          ) : null}

          {driver && !cancelled && !completed ? (
            <div className="grid grid-cols-3 gap-1 pt-0.5">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="relative">
                  {driver.avatar ? (
                    <img
                      src={driver.avatar}
                      alt=""
                      className="size-[56px] rounded-full object-cover ring-[3px] ring-primary/35"
                    />
                  ) : (
                    <div className="size-[56px] rounded-full bg-[#E0E4EB] ring-[3px] ring-primary/35" />
                  )}
                  <span className="absolute -start-1 -top-1 flex items-center gap-0.5 rounded-full border border-[#F0F2F5] bg-white px-1.5 py-0.5 text-[10px] font-bold text-ink shadow-sm">
                    <Star className="size-3 fill-amber-400 text-amber-500" />
                    4.7
                  </span>
                </div>
                <span className={cn('max-w-[5.5rem] truncate text-[12px] font-bold leading-tight', ink)}>{driverShort}</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="flex size-[56px] items-center justify-center rounded-full bg-primary text-white shadow-[0_6px_18px_rgba(92,45,142,0.4)] transition active:scale-[0.97]"
                  aria-label="التواصل مع السائق"
                >
                  <Phone className="size-6" strokeWidth={2.25} />
                </button>
                <span className={cn('px-0.5 text-[11px] font-bold leading-snug text-[#3d4553]', ink)}>التواصل مع السائق</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onSos}
                  className="relative flex size-[56px] items-center justify-center rounded-full bg-primary text-white shadow-[0_6px_18px_rgba(92,45,142,0.4)] transition active:scale-[0.97]"
                  aria-label="السلامة"
                >
                  <Shield className="size-6" strokeWidth={2.25} />
                  <span className="absolute -start-0.5 -top-0.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />
                </button>
                <span className={cn('text-[11px] font-bold leading-snug', ink)}>السلامة</span>
              </div>
            </div>
          ) : null}

          {!cancelled && !completed ? (
            <Link
              to={`/app/chat?rideId=${rideId}`}
              className="flex items-center justify-between gap-2 rounded-[18px] bg-[#F1F2F6] px-3 py-3.5 transition hover:bg-[#E8EAEF]"
            >
              <ChevronLeft className="size-5 shrink-0 text-[#A8B0BD]" />
              <p className="min-w-0 flex-1 text-end text-[13px] font-medium leading-snug text-[#5c6575]">
                أضف أي ملاحظات للسائق
              </p>
              <MessageSquare className="size-5 shrink-0 text-primary" strokeWidth={2} />
            </Link>
          ) : null}

          <div className="flex items-center justify-between gap-3 rounded-[20px] border border-[#EEF0F4] bg-white px-3 py-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center text-xl" aria-hidden>
              💵
            </div>
            <div className="min-w-0 flex-1 text-end">
              <p className={cn('text-[11px] font-bold text-[#8595AD]', muted)}>الدفع</p>
              <p className={cn('text-[17px] font-black tabular-nums', ink)}>
                {fare != null ? `${fare} E£` : '—'}{' '}
                <span className="text-[14px] font-bold text-[#2e7d32]">{payLabel}</span>
              </p>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#EEF0F4] bg-white p-4 text-end shadow-sm">
            <p className="mb-3 text-[12px] font-black text-primary">رحلتك الحالية</p>
            <div className="relative flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="size-3 shrink-0 rounded-full bg-emerald-500 ring-[3px] ring-emerald-100" />
                <span className="mt-0.5 min-h-[28px] w-0.5 grow rounded-full bg-[#D5D9E2]" />
                <span className="size-3 shrink-0 rounded-full bg-red-500 ring-[3px] ring-red-100" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <p className={cn('text-[14px] font-semibold leading-snug', ink)}>{pickup?.address || booking.startAddress}</p>
                <p className={cn('text-[14px] font-semibold leading-snug', ink)}>{dropoff?.address || booking.endAddress}</p>
              </div>
            </div>
          </div>

          {!cancelled && !completed ? (
            <>
              <button
                type="button"
                onClick={onShareTrip}
                className="flex w-full items-center justify-between border-b border-[#F0F2F5] py-3 text-start"
              >
                <ChevronLeft className="size-5 text-[#8595AD]" />
                <span className={cn('flex-1 text-end text-sm font-semibold', ink)}>مشاركة الرحلة</span>
                <Share2 className="size-5 text-primary" />
              </button>
              <a
                href="tel:123"
                className="flex items-center justify-between py-2 text-start"
                onClick={(e) => {
                  e.preventDefault()
                  window.location.href = 'tel:123'
                }}
              >
                <ChevronLeft className="size-5 text-[#8595AD]" />
                <span className="flex-1 text-end text-sm font-semibold text-red-600">الاتصال بالطوارئ</span>
                <Siren className="size-5 text-red-600" />
              </a>
            </>
          ) : null}

          {cancelled ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-800">هذه الرحلة ملغاة.</p>
          ) : null}
          {completed && booking.isDriverRated ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-900">شكراً — تم تقييم هذه الرحلة.</p>
          ) : null}

          {showRateCta ? (
            <Button type="button" className="h-12 w-full rounded-2xl gap-2 text-base font-semibold" onClick={goRate}>
              <Star className="size-5" />
              تقييم الرحلة والسائق
            </Button>
          ) : null}

          {!cancelled && !completed ? (
            <div className="flex flex-col gap-2 pt-1">
              {canEndTrip ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 w-full rounded-2xl"
                  disabled={busy}
                  onClick={onEndTrip}
                >
                  إنهاء الرحلة (اختبار)
                </Button>
              ) : null}
              {canCancel ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-2xl border-red-200 text-red-700 hover:bg-red-50"
                  disabled={busy}
                  onClick={() => setCancelUi('confirm')}
                >
                  إلغاء الرحلة
                </Button>
              ) : null}
            </div>
          ) : null}

          <p className="text-center text-[10px] leading-tight text-[#B8C0CC]">
            {socketLive ? (
              <span className="text-emerald-600">● تتبع مباشر للسائق</span>
            ) : (
              <span>تحديث الموقع: REST {socketHostHint ? `· ${socketHostHint}` : ''}</span>
            )}
          </p>
          <Button asChild variant="ghost" className="h-10 w-full rounded-xl text-primary">
            <Link to="/app/support">الدعم والمساعدة</Link>
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {contactOpen ? (
          <motion.div
            key="contact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ y: 40, opacity: 0.9 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="relative w-full max-w-md rounded-t-[24px] bg-white px-4 pb-8 pt-4 shadow-xl"
            >
              <button
                type="button"
                className="absolute start-3 top-3 flex size-9 items-center justify-center rounded-full bg-[#F0F2F5] text-ink"
                onClick={() => setContactOpen(false)}
                aria-label="إغلاق"
              >
                <X className="size-5" />
              </button>
              <p className="pt-8 text-center text-lg font-black text-ink">جاري التواصل مع السائق</p>
              <p className="mx-auto mt-2 max-w-[300px] text-center text-[13px] leading-relaxed text-[#6B7788]">
                المكالمات المجانية هي وسيلة مريحة للوصول إلى سائقك. لن يتم مشاركة رقمك عندما يوفّر النظام وسيطاً.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                {tel ? (
                  <>
                    <a
                      href={`tel:${tel}`}
                      className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-primary text-base font-bold text-white shadow-[0_8px_24px_rgba(92,45,142,0.35)]"
                    >
                      مكالمة مجانية
                    </a>
                    <a
                      href={`tel:${tel}`}
                      className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#F1F2F6] text-base font-bold text-ink"
                    >
                      مكالمة عادية
                    </a>
                    <Button type="button" variant="ghost" className="h-11 w-full rounded-xl text-sm font-semibold text-primary" asChild>
                      <Link to={`/app/chat?rideId=${rideId}`} onClick={() => setContactOpen(false)}>
                        محادثة داخل التطبيق
                      </Link>
                    </Button>
                  </>
                ) : (
                  <Button type="button" className="h-[52px] w-full rounded-2xl text-base font-bold" asChild>
                    <Link to={`/app/chat?rideId=${rideId}`} onClick={() => setContactOpen(false)}>
                      محادثة مع السائق
                    </Link>
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {cancelUi === 'confirm' ? (
          <motion.div
            key="cancel-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] flex items-end justify-center bg-black/45 p-3"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ y: 48 }}
              animate={{ y: 0 }}
              exit={{ y: 32 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="w-full max-w-md rounded-t-[26px] bg-white px-4 pb-8 pt-5 shadow-xl"
            >
              <div className="flex flex-col items-center">
                {driver?.avatar ? (
                  <img src={driver.avatar} alt="" className="size-20 rounded-full object-cover ring-2 ring-primary/30" />
                ) : (
                  <div className="size-20 rounded-full bg-[#E0E4EB] ring-2 ring-primary/30" />
                )}
                <p className="mt-3 text-center text-base font-extrabold text-ink">
                  {driverShort} سيصل خلال ~ 2 دقيقة
                </p>
                <p className="mt-1 text-center text-sm text-[#52627A]">هل أنت متأكد أنك تريد الإلغاء؟</p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-6">
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelUi('safety')
                    }}
                    className="flex size-14 items-center justify-center rounded-full border border-[#E8EAEF] bg-white shadow-md"
                    aria-label="إلغاء"
                  >
                    <X className="size-7 text-red-600" />
                  </button>
                  <span className="text-center text-xs font-semibold text-ink">إلغاء الرحلة</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setContactOpen(true)}
                    className="flex size-14 items-center justify-center rounded-full border border-[#E8EAEF] bg-white shadow-md"
                    aria-label="تواصل"
                  >
                    <Phone className="size-6 text-primary" />
                  </button>
                  <span className="text-center text-xs font-semibold text-ink">التواصل مع السائق</span>
                </div>
              </div>
              <Button
                type="button"
                className="mt-8 h-[52px] w-full rounded-full border-0 bg-cta text-base font-black text-cta-foreground shadow-md hover:bg-cta/90"
                onClick={() => setCancelUi(null)}
              >
                انتظار السائق
              </Button>
            </motion.div>
          </motion.div>
        ) : null}

        {cancelUi === 'safety' ? (
          <motion.div
            key="cancel-safety"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[66] flex items-end justify-center bg-black/5 p-3"
            role="dialog"
          >
            <motion.div
              initial={{ y: 36 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              className="w-full max-w-md rounded-t-[22px] bg-white px-4 pb-6 pt-5 shadow-2xl ring-1 ring-black/5"
            >
              <p className="text-end text-lg font-extrabold leading-snug text-ink">رحلات أكثر أماناً مع GO</p>
              <p className="mt-3 text-end text-sm leading-relaxed text-[#52627A]">
                إذا طلب منك السائق إلغاء الرحلة والدفع خارج التطبيق، لا توافق — الرحلات عبر التطبيق فقط تُتابَع
                وتُسهَّل المساعدة عند الحاجة.
              </p>
              <Button
                type="button"
                className="mt-5 h-12 w-full rounded-2xl bg-cta text-base font-bold text-cta-foreground"
                onClick={() => setCancelUi(null)}
              >
                سأواصل استخدام التطبيق
              </Button>
              <Button
                type="button"
                variant="outline"
                className="mt-2 h-12 w-full rounded-2xl border-red-200 font-bold text-red-600 hover:bg-red-50"
                onClick={() => setCancelUi('reasons')}
              >
                إلغاء الرحلة
              </Button>
            </motion.div>
          </motion.div>
        ) : null}

        {cancelUi === 'reasons' ? (
          <motion.div
            key="cancel-reasons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[67] flex items-end justify-center bg-black/45 p-0"
            role="dialog"
          >
            <motion.div
              initial={{ y: 56 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              className="max-h-[85dvh] w-full max-w-md overflow-hidden rounded-t-[26px] bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[#F0F2F5] px-3 py-3">
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-full bg-[#F4F6FA]"
                  onClick={() => setCancelUi('confirm')}
                  aria-label="رجوع"
                >
                  <X className="size-5" />
                </button>
                <p className="flex-1 text-center text-base font-bold text-ink">لماذا تريد الإلغاء؟</p>
                <span className="w-9" />
              </div>
              <ul className="max-h-[60dvh] overflow-y-auto px-1 py-2">
                {CANCEL_REASONS.map((r) => (
                  <li key={r}>
                    <button
                      type="button"
                      disabled={busy}
                      className="flex w-full items-center justify-between border-b border-[#f4f6fa] px-4 py-3.5 text-end text-sm font-medium text-ink transition hover:bg-[#fafafa]"
                      onClick={() => finalizeCancel(r)}
                    >
                      <ChevronLeft className="size-4 shrink-0 text-[#c5ccd6]" />
                      <span className="flex-1">{r}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
