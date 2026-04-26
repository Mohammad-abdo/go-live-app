import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ChevronRight,
  CreditCard,
  MessageSquareText,
  Navigation,
  Phone,
  Star,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import TripLiveMap from '@/components/map/TripLiveMap'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage, unwrapData } from '@/lib/apiResponse'
import { api } from '@/lib/api'
import * as rider from '@/services/riderService'
import { cn } from '@/lib/utils'

const ink = 'text-[#0A0C0F]'
const muted = 'text-[#52627A]'

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

export default function ActiveTrip() {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const role = getActiveRole()

  const [booking, setBooking] = useState(null)
  const [pulse, setPulse] = useState(null)
  const [loadErr, setLoadErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

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
    const loc = pulse?.driverLocation
    if (!loc) return null
    const lat = num(loc.lat)
    const lng = num(loc.lng)
    if (lat == null || lng == null) return null
    return { lat, lng }
  }, [pulse])

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

  const onCancel = async () => {
    if (!rideId || !booking) return
    setBusy(true)
    try {
      await rider.cancelTrip({
        booking_id: rideId,
        driver_id: driverId,
        reason: cancelReason.trim() || undefined,
      })
      toast.success('تم إلغاء الرحلة')
      setCancelOpen(false)
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
  const name = driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() : 'السائق'
  const completed = String(booking.status) === 'completed'
  const cancelled = String(booking.status) === 'cancelled'
  const showRateCta = completed && !booking.isDriverRated

  return (
    <div dir="rtl" className="relative -mx-4 -mt-4 flex min-h-[calc(100svh-var(--safe-top)-var(--safe-bottom))] flex-col">
      <div className="relative z-0 min-h-[42vh] flex-1">
        {pickup && dropoff ? (
          <TripLiveMap className="absolute inset-0 min-h-[42vh]" pickup={pickup} dropoff={dropoff} driver={driverPoint} />
        ) : (
          <div className="absolute inset-0 bg-[#e8eaef]" />
        )}
      </div>

      <div className="pointer-events-auto relative z-10 flex max-h-[58vh] flex-col rounded-t-[24px] bg-white px-4 pb-6 pt-3 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-[#e7e9f2]" />
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/app/trips"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#F0F2F5] bg-white text-primary shadow-sm"
              aria-label="رجوع"
            >
              <ChevronRight className="size-5 rtl:rotate-180" />
            </Link>
            <span className="rounded-full bg-[#F0F2F5] px-3 py-1 text-xs font-semibold text-ink">{statusAr(liveStatus)}</span>
          </div>
          <div className="flex items-start justify-between gap-2 text-end">
            <Navigation className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className={cn('text-base font-bold', ink)}>رحلة #{rideId}</p>
              {otp ? <p className="mt-0.5 text-xs text-primary">رمز الرحلة: {otp}</p> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-[#F0F2F5] bg-[#fafafa] p-3 text-end text-sm">
            <p className={cn('font-medium', ink)}>{pickup?.address || booking.startAddress}</p>
            <p className="mt-2 text-[#8595AD]">↓</p>
            <p className={cn('font-medium', ink)}>{dropoff?.address || booking.endAddress}</p>
          </div>

          {driver ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[#F0F2F5] p-3">
              {driver.avatar ? (
                <img src={driver.avatar} alt="" className="size-12 shrink-0 rounded-full object-cover ring-2 ring-white" />
              ) : (
                <div className="size-12 shrink-0 rounded-full bg-[#E0E4EB] ring-2 ring-white" />
              )}
              <div className="min-w-0 flex-1 text-end">
                <p className={cn('font-semibold', ink)}>{name}</p>
                {driver.contactNumber ? (
                  <p className={cn('text-xs', muted)} dir="ltr">
                    {driver.contactNumber}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                {driver.contactNumber ? (
                  <a
                    href={`tel:${driver.contactNumber}`}
                    className="flex size-11 items-center justify-center rounded-full bg-primary text-white shadow-md"
                    aria-label="اتصال"
                  >
                    <Phone className="size-5" />
                  </a>
                ) : null}
                <Button asChild size="icon" className="size-11 rounded-full" variant="secondary">
                  <Link to={`/app/chat?rideId=${rideId}`} aria-label="محادثة">
                    <MessageSquareText className="size-5 text-primary" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#F0F2F5] px-3 py-3">
            <CreditCard className="size-5 text-[#52627A]" />
            <div className="flex-1 text-end">
              <p className={cn('text-xs', muted)}>الأجرة والدفع</p>
              <p className={cn('text-base font-bold', ink)}>
                {fare != null ? `E£ ${fare}` : '—'} <span className="text-sm font-medium text-[#52627A]">({payLabel})</span>
              </p>
              {booking.subtotal != null && Number(booking.subtotal) !== Number(booking.totalAmount) ? (
                <p className={cn('text-xs', muted)}>بعد الخصم / الإضافات: E£ {booking.subtotal}</p>
              ) : null}
            </div>
          </div>

          {cancelled ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-800">هذه الرحلة ملغاة.</p>
          ) : null}

          {completed && booking.isDriverRated ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-900">شكراً — تم تقييم هذه الرحلة.</p>
          ) : null}

          {showRateCta ? (
            <Button type="button" className="h-12 w-full rounded-xl gap-2 text-base font-semibold" onClick={goRate}>
              <Star className="size-5" />
              تقييم الرحلة والسائق
            </Button>
          ) : null}

          {!cancelled && !completed ? (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl border-amber-200 text-amber-900 hover:bg-amber-50"
                disabled={busy}
                onClick={onSos}
              >
                <AlertTriangle className="ms-2 size-4" />
                SOS (تجريبي)
              </Button>
              {canEndTrip ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 w-full rounded-xl"
                  disabled={busy}
                  onClick={onEndTrip}
                >
                  إنهاء الرحلة (اختبار — كراكب)
                </Button>
              ) : null}
              {canCancel ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                  disabled={busy}
                  onClick={() => setCancelOpen(true)}
                >
                  إلغاء الرحلة
                </Button>
              ) : null}
            </div>
          ) : null}

          <Button asChild variant="ghost" className="h-10 w-full rounded-xl text-primary">
            <Link to="/app/support">الدعم والمساعدة</Link>
          </Button>
        </div>
      </div>

      {cancelOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4" role="dialog">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-end text-base font-bold text-ink">تأكيد الإلغاء</p>
            <p className="mt-2 text-end text-sm text-[#52627A]">سيتم إشعار السائق. يمكنك إضافة سبب اختياري.</p>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="سبب الإلغاء (اختياري)"
              className="mt-3 h-11 rounded-xl text-end"
              dir="rtl"
            />
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setCancelOpen(false)}>
                رجوع
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
