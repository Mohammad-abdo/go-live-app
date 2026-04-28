import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Clock, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import * as driver from '@/services/driverService'
import { getErrorMessage } from '@/lib/apiResponse'
import { cn } from '@/lib/utils'

const ink = 'text-[#0A0C0F]'
const muted = 'text-[#52627A]'

function isLiveStatus(st) {
  return ['accepted', 'arrived', 'started', 'in_progress', 'ongoing'].includes(String(st || ''))
}

export default function DriverNegotiationWaiting() {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const [ride, setRide] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!rideId) return
    try {
      const r = await driver.getRideDetail(rideId)
      setRide(r && typeof r === 'object' ? r : null)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [rideId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!rideId) return
    const t = window.setInterval(load, 3500)
    return () => window.clearInterval(t)
  }, [rideId, load])

  const st = String(ride?.status || '')
  const negotiatedFare =
    ride?.negotiatedFare ?? ride?.negotiated_fare ?? ride?.negotiationFare ?? ride?.negotiation_fare ?? null

  const statusLabel = useMemo(() => {
    if (!ride) return '—'
    if (isLiveStatus(st)) return 'تم قبول العرض — جاري فتح الرحلة…'
    if (st === 'negotiating') return 'في انتظار موافقة الراكب على عرض السعر'
    if (st === 'cancelled') return 'تم رفض/إلغاء العرض'
    if (st === 'pending' || st === 'searching') return 'لم يتم قبول العرض'
    return st || '—'
  }, [ride, st])

  useEffect(() => {
    if (!ride) return
    if (isLiveStatus(st)) {
      navigate(`/app/trip/${rideId}`, { replace: true })
      return
    }
    if (st === 'cancelled') {
      toast.message('تم رفض/إلغاء العرض')
      navigate('/app/home', { replace: true })
      return
    }
    if (st && st !== 'negotiating' && !isLiveStatus(st)) {
      // Fallback: any non-live unexpected state returns to home.
      navigate('/app/home', { replace: true })
    }
  }, [ride, st, navigate, rideId])

  return (
    <div dir="rtl" className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col bg-[#fafafa] px-4 pb-6 pt-5">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/app/home"
          className="flex size-10 items-center justify-center rounded-full border border-[#EEF0F4] bg-white text-primary shadow-sm"
          aria-label="رجوع"
        >
          <ChevronRight className="size-5 rtl:rotate-180" />
        </Link>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#52627A] shadow-sm ring-1 ring-black/5">
          {st || '—'}
        </span>
      </div>

      <div className="mt-8 rounded-[24px] border border-[#EEF0F4] bg-white p-5 shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Clock className="size-7" />
        </div>
        <p className={cn('mt-4 text-center text-lg font-black', ink)}>انتظار موافقة الراكب</p>
        <p className={cn('mt-2 text-center text-sm leading-relaxed', muted)}>{statusLabel}</p>

        {negotiatedFare != null ? (
          <div className="mt-4 rounded-2xl bg-[#FAFBFC] p-4 text-center ring-1 ring-black/5">
            <p className="text-[11px] font-bold text-[#8595AD]">عرض السعر</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-primary">E£ {negotiatedFare}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-[#8595AD]">
            <span className="size-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
            تحديث الحالة…
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          <Button type="button" className="h-12 w-full rounded-2xl" onClick={load}>
            تحديث الآن
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-2xl border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => navigate('/app/home', { replace: false })}
          >
            رجوع للرئيسية
          </Button>
        </div>
      </div>
    </div>
  )
}

