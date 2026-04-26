import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight, MessageSquareText, Navigation, Phone, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TripLiveMap from '@/components/map/TripLiveMap'
import { getErrorMessage } from '@/lib/apiResponse'
import * as driver from '@/services/driverService'
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
    negotiating: 'تفاوض',
    accepted: 'مقبولة',
    arrived: 'وصلت للراكب',
    started: 'بدأت',
    in_progress: 'جارية',
    ongoing: 'جارية',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
  }
  return m[s] || s || '—'
}

export default function DriverActiveTrip() {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const [ride, setRide] = useState(null)
  const [loadErr, setLoadErr] = useState(null)
  const [busy, setBusy] = useState(false)

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
  const pay = ride.paymentType === 'cash' ? 'نقداً' : ride.paymentType || '—'
  const done = st === 'completed' || st === 'cancelled'

  return (
    <div dir="rtl" className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#E8EAEF]">
      <div className="relative z-0 flex min-h-[200px] flex-[0_1_40%] basis-[38dvh] max-h-[44dvh] shrink-0 overflow-hidden">
        {pickup && dropoff ? (
          <TripLiveMap className="absolute inset-0 h-full w-full" pickup={pickup} dropoff={dropoff} driver={null} />
        ) : (
          <div className="absolute inset-0 bg-[#dde1e8]" />
        )}
      </div>

      <div className="relative z-10 flex min-h-0 flex-[1_1_auto] flex-col rounded-t-[28px] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#e0e4eb]" />
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            to="/app/trips"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#F0F2F5] bg-white text-primary shadow-sm"
            aria-label="رجوع"
          >
            <ChevronRight className="size-5 rtl:rotate-180" />
          </Link>
          <span className="rounded-full bg-[#F4F6FA] px-3 py-1 text-[11px] font-semibold text-ink">{statusAr(st)}</span>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
          <div className="flex items-start justify-between gap-2">
            <Navigation className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1 text-end">
              <p className={cn('text-base font-black', ink)}>رحلة الكابتن #{rideId}</p>
              <p className={cn('mt-0.5 text-xs', muted)}>{name}</p>
            </div>
          </div>

          {rider ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[#F0F2F5] p-3">
              {rider.avatar ? (
                <img src={rider.avatar} alt="" className="size-12 shrink-0 rounded-full object-cover ring-2 ring-white" />
              ) : (
                <div className="size-12 shrink-0 rounded-full bg-[#E0E4EB] ring-2 ring-white" />
              )}
              <div className="min-w-0 flex-1 text-end">
                <p className={cn('font-semibold', ink)}>{name}</p>
                {tel ? (
                  <p className={cn('text-xs', muted)} dir="ltr">
                    {tel}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                {tel ? (
                  <a
                    href={`tel:${tel}`}
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

          <div className="rounded-2xl border border-[#F0F2F5] bg-[#fafafa] p-3 text-end text-sm">
            <p className={cn('font-medium', ink)}>{pickup?.address || ride.startAddress}</p>
            <p className="my-2 text-center text-[#8595AD]">↓</p>
            <p className={cn('font-medium', ink)}>{dropoff?.address || ride.endAddress}</p>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#F0F2F5] px-3 py-3">
            <Star className="size-5 text-amber-500" />
            <div className="flex-1 text-end">
              <p className={cn('text-xs', muted)}>الأجرة</p>
              <p className={cn('text-base font-bold tabular-nums', ink)}>
                {fare != null ? `E£ ${fare}` : '—'} <span className="text-sm font-medium text-[#52627A]">({pay})</span>
              </p>
            </div>
          </div>

          {!done ? (
            <div className="flex flex-col gap-2">
              {st === 'accepted' ? (
                <Button type="button" className="h-11 w-full rounded-xl font-bold" disabled={busy} onClick={onArrived}>
                  وصلت إلى الراكب
                </Button>
              ) : null}
              {st === 'arrived' ? (
                <Button type="button" className="h-11 w-full rounded-xl font-bold" disabled={busy} onClick={onStarted}>
                  بدء الرحلة
                </Button>
              ) : null}
              {st === 'started' || st === 'in_progress' || st === 'ongoing' ? (
                <Button type="button" className="h-11 w-full rounded-xl font-bold" disabled={busy} onClick={onComplete}>
                  إنهاء الرحلة وتأكيد التحصيل
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-900">انتهت هذه الرحلة.</p>
          )}
        </div>
      </div>
    </div>
  )
}
