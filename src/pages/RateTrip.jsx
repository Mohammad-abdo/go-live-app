import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage } from '@/lib/apiResponse'
import * as rider from '@/services/riderService'
import { cn } from '@/lib/utils'

const ink = 'text-[#0A0C0F]'
const muted = 'text-[#52627A]'

export default function RateTrip() {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const role = getActiveRole()

  const [booking, setBooking] = useState(null)
  const [stars, setStars] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!rideId || role !== 'rider') return
    setLoading(true)
    try {
      const b = await rider.getBookingById(rideId)
      setBooking(b && typeof b === 'object' ? b : null)
    } catch (e) {
      toast.error(getErrorMessage(e))
      setBooking(null)
    } finally {
      setLoading(false)
    }
  }, [rideId, role])

  useEffect(() => {
    load()
  }, [load])

  const submit = async () => {
    if (!rideId || !booking?.driver?.id) return
    if (booking.isDriverRated) {
      toast.message('تم التقييم مسبقاً')
      navigate(`/app/trip/${rideId}`, { replace: true })
      return
    }
    setSaving(true)
    try {
      await rider.rateDriver({
        driver_id: booking.driver.id,
        booking_id: rideId,
        rate: stars,
        text: comment.trim() || undefined,
      })
      toast.success('شكراً لتقييمك')
      navigate(`/app/trip/${rideId}`, { replace: true })
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (role === 'driver') {
    return (
      <div dir="rtl" className="py-8 text-center text-sm text-[#52627A]">
        التقييم متاح للراكب فقط.
        <div className="mt-4">
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/app/trips">رجوع</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-[#52627A]">جاري التحميل…</p>
  }

  if (!booking) {
    return (
      <div dir="rtl" className="space-y-4 py-8 text-center">
        <p className={cn('text-sm', muted)}>لم يُعثر على الرحلة.</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/app/trips">السجل</Link>
        </Button>
      </div>
    )
  }

  if (String(booking.status) !== 'completed') {
    return (
      <div dir="rtl" className="space-y-4 py-8 text-center">
        <p className={cn('text-sm', muted)}>يمكن التقييم بعد اكتمال الرحلة.</p>
        <Button asChild className="rounded-xl">
          <Link to={`/app/trip/${rideId}`}>عرض الرحلة</Link>
        </Button>
      </div>
    )
  }

  if (booking.isDriverRated) {
    return (
      <div dir="rtl" className="space-y-4 py-8 text-center">
        <Star className="mx-auto size-12 fill-amber-400 text-amber-400" />
        <p className={cn('font-semibold', ink)}>تم حفظ تقييمك لهذه الرحلة.</p>
        <Button asChild className="rounded-xl">
          <Link to={`/app/trip/${rideId}`}>عرض ملخص الرحلة</Link>
        </Button>
      </div>
    )
  }

  const name = booking.driver
    ? `${booking.driver.firstName || ''} ${booking.driver.lastName || ''}`.trim()
    : 'السائق'

  return (
    <div dir="rtl" className="mx-auto max-w-md space-y-5 pb-8">
      <div className="flex items-center justify-between gap-2">
        <Link
          to={`/app/trip/${rideId}`}
          className="flex size-9 items-center justify-center rounded-full border border-[#F0F2F5] bg-white shadow-sm"
          aria-label="رجوع"
        >
          <ChevronRight className="size-5 text-primary rtl:rotate-180" />
        </Link>
        <h1 className={cn('text-lg font-bold', ink)}>تقييم الرحلة</h1>
        <span className="size-9" aria-hidden />
      </div>

      <p className="text-end text-sm text-[#52627A]">
        كيف كانت تجربتك مع <span className="font-semibold text-ink">{name}</span>؟
      </p>

      <div className="flex justify-center gap-2 py-2" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            className="rounded-lg p-1 transition-transform active:scale-95"
            aria-label={`${n} stars`}
          >
            <Star
              className={cn('size-10', n <= stars ? 'fill-amber-400 text-amber-400' : 'text-[#E0E4EB]')}
              strokeWidth={n <= stars ? 0 : 1.5}
            />
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="rate-comment" className="mb-1 block text-end text-sm font-medium text-[#52627A]">
          تعليق (اختياري)
        </label>
        <Input
          id="rate-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="اكتب ملاحظاتك…"
          className="h-11 rounded-xl text-end"
          dir="rtl"
        />
      </div>

      <Button type="button" className="h-12 w-full rounded-xl text-base font-semibold" disabled={saving} onClick={submit}>
        {saving ? 'جاري الإرسال…' : 'إرسال التقييم'}
      </Button>

      <p className="text-center text-[10px] text-[#8595AD]">يُرسل إلى الخادم: POST /apimobile/user/offers/rate-driver</p>
    </div>
  )
}
