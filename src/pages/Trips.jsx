import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, Clock, MessageSquareText, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FIGMA_ASSETS } from '@/lib/figmaAssets'
import { cn } from '@/lib/utils'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage } from '@/lib/apiResponse'
import * as rider from '@/services/riderService'
import * as driver from '@/services/driverService'

const ACTIVE = new Set(['pending', 'searching', 'accepted', 'arrived', 'arrived_at_pickup', 'in_progress', 'ongoing', 'started'])

function MapBg({ src }) {
  const [bad, setBad] = useState(false)
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#e8eaef]">
      {!bad ? (
        <img alt="" className="size-full object-cover" src={src} onError={() => setBad(true)} />
      ) : (
        <div
          className="size-full opacity-90"
          style={{
            background:
              'linear-gradient(165deg,#dfe3ea 0%,#eef1f5 40%,#e4e8ef 100%),repeating-linear-gradient(90deg,transparent,transparent 12px,rgba(0,0,0,0.03) 12px,rgba(0,0,0,0.03) 13px)',
          }}
        />
      )}
    </div>
  )
}

const ink = 'text-[#0A0C0F]'

function TripInProgressSheet({ ride, role }) {
  const driver = ride?.driver
  const name = driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() : 'السائق'
  const rideId = ride?.id ?? ride?.book_id
  const fare = ride?.totalAmount != null ? `E£ ${ride.totalAmount}` : '—'
  const pay = ride?.paymentType === 'cash' ? 'نقداً' : ride?.paymentType || ''

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex max-h-[72%] flex-col rounded-t-[20px] bg-white px-5 pb-1 shadow-[0_-8px_32px_rgba(0,0,0,0.1)]">
      <div className="flex flex-col gap-4 overflow-y-auto py-4">
        <div className="mx-auto h-1 w-12 rounded-full bg-[#e7e9f2]" />
        <div className="flex gap-2.5">
          <div className="flex w-[84px] shrink-0 flex-col items-center gap-2.5">
            <div className="flex h-[30px] w-[60px] items-center justify-center rounded-lg bg-[#F0F2F5] text-2xl">
              🚗
            </div>
            <div className="flex h-[26px] w-full items-center justify-center rounded-lg bg-[#F0F2F5] px-2">
              <span className="text-xs font-medium text-[#7a7c87]">{ride?.status || ''}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 text-end">
            <p className={cn('text-base font-semibold text-black')}>رحلة نشطة</p>
            <p className="mt-1 text-sm font-medium text-[#7a7c87]">{ride?.startAddress || ''}</p>
          </div>
        </div>
        {role === 'rider' && driver ? (
          <div className="flex items-stretch justify-center gap-4">
            <div className="flex flex-1 flex-col items-center gap-2.5">
              {driver.contactNumber ? (
                <a
                  href={`tel:${driver.contactNumber}`}
                  className="flex size-12 items-center justify-center rounded-[24px] bg-primary text-white shadow-md"
                  aria-label="اتصال"
                >
                  <Phone className="size-6" strokeWidth={2} />
                </a>
              ) : (
                <div className="flex size-12 items-center justify-center rounded-[24px] bg-[#F0F2F5] text-[#8595AD]">
                  <Phone className="size-6" strokeWidth={2} />
                </div>
              )}
              <span className="text-center text-xs font-medium text-black">التواصل مع السائق</span>
            </div>
            <div className="flex flex-1 flex-col items-center gap-2">
              <div className="relative">
                {driver.avatar ? (
                  <img src={driver.avatar} alt="" className="size-12 rounded-full object-cover ring-2 ring-white" />
                ) : (
                  <div className="size-12 rounded-full bg-[#E0E4EB] ring-2 ring-white" />
                )}
              </div>
              <span className="text-center text-xs font-medium text-black">{name}</span>
            </div>
          </div>
        ) : null}
        {rideId ? (
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full rounded-xl">
              <Link to={`/app/trip/${rideId}`} className="flex items-center justify-center gap-2">
                <Navigation className="size-5" />
                تتبع الرحلة والدفع
              </Link>
            </Button>
            <Button asChild className="w-full rounded-xl" variant="secondary">
              <Link to={`/app/chat?rideId=${rideId}`} className="flex items-center justify-center gap-2">
                <MessageSquareText className="size-5 text-primary" />
                محادثة الرحلة
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex gap-2.5 py-2">
        <Button type="button" className="h-[50px] flex-1 rounded-xl text-sm font-medium" asChild>
          <Link to="/app/support" className="flex h-full w-full items-center justify-center">
            الاتصال بالدعم
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-[50px] flex-1 rounded-xl border-[#c80000] bg-[rgba(200,0,0,0.02)] text-sm font-medium text-[#c80000] hover:bg-red-50"
          asChild
        >
          <Link to="/app/home">العودة للخريطة</Link>
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[#F0F2F5] py-4">
        <ChevronLeft className="size-[18px] shrink-0 text-[#52627A] rtl:rotate-180" />
        <div className="flex flex-1 items-center justify-end gap-1 text-end">
          <span className="text-sm text-[#52627A]">{pay}</span>
          <span className={cn('text-base font-medium', ink)}>{fare}</span>
        </div>
        <span className="text-xl" aria-hidden>
          💵
        </span>
      </div>
   
    </div>
  )
}

export default function Trips() {
  const location = useLocation()
  const navigate = useNavigate()
  const role = getActiveRole()
  const highlightId = location.state?.highlightBookingId
  const [tab, setTab] = useState(() => (highlightId != null ? 'past' : 'current'))
  const [activeRide, setActiveRide] = useState(null)
  const [past, setPast] = useState([])
  const [driverRides, setDriverRides] = useState([])
  const [loading, setLoading] = useState(true)

  const loadRider = useCallback(async () => {
    try {
      const live = await rider.getActiveRide()
      setActiveRide(live && typeof live === 'object' && live.id ? live : null)
      const pack = await rider.getMyBookings({ page: 1, limit: 30 })
      const bookings = Array.isArray(pack?.bookings) ? pack.bookings : []
      setPast(bookings.filter((b) => !ACTIVE.has(b.status)))
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [])

  const loadDriver = useCallback(async () => {
    try {
      const rides = await driver.getMyRides({ page: 1, per_page: 30, status: 'all' })
      setDriverRides(Array.isArray(rides) ? rides : [])
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [])

  useEffect(() => {
    let c = false
    ;(async () => {
      setLoading(true)
      if (role === 'driver') await loadDriver()
      else await loadRider()
      if (!c) setLoading(false)
    })()
    return () => {
      c = true
    }
  }, [role, loadDriver, loadRider])

  return (
    <div dir="rtl">
      <div className="space-y-3">
        <div className="mx-auto flex max-w-md rounded-2xl bg-[#F0F2F5] p-1">
          <button
            type="button"
            className={cn(
              'flex-1 rounded-xl py-2 text-sm font-semibold transition-colors',
              tab === 'current' ? 'bg-white text-ink shadow-sm' : 'text-[#52627A]',
            )}
            onClick={() => setTab('current')}
          >
            الحالية
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 rounded-xl py-2 text-sm font-semibold transition-colors',
              tab === 'past' ? 'bg-white text-ink shadow-sm' : 'text-[#52627A]',
            )}
            onClick={() => setTab('past')}
          >
            {role === 'driver' ? 'كل الرحلات' : 'السابقة'}
          </button>
        </div>

        {loading ? <p className="text-center text-sm text-[#52627A]">جاري التحميل…</p> : null}

        {tab === 'past' ? (
          <div className="space-y-2">
            {role === 'driver'
              ? driverRides.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      'rounded-[16px] border border-[#F0F2F5] bg-white p-3 text-end shadow-sm',
                      highlightId === r.id && 'ring-2 ring-primary',
                    )}
                  >
                    <p className="text-sm font-semibold text-ink">رحلة #{r.id}</p>
                    <p className="text-xs text-[#52627A]">{r.status}</p>
                    <p className="mt-1 text-sm text-ink">{r.startAddress || '—'}</p>
                  </div>
                ))
              : past.map((b) => (
                  <button
                    type="button"
                    key={b.book_id}
                    onClick={() => navigate(`/app/trip/${b.book_id}`)}
                    className={cn(
                      'w-full rounded-[16px] border border-[#F0F2F5] bg-white p-3 text-end shadow-sm transition-colors hover:border-primary/30 hover:bg-[#fafafa]',
                      highlightId === b.book_id && 'ring-2 ring-primary',
                    )}
                  >
                    <p className="text-sm font-semibold text-ink">{b.from?.address || '—'} → {b.to?.address || '—'}</p>
                    <p className="text-xs text-[#52627A]">{b.status}</p>
                    {b.totalAmount != null ? <p className="mt-1 text-sm">E£ {b.totalAmount}</p> : null}
                    {String(b.status) === 'completed' && !b.isDriverRated ? (
                      <p className="mt-2 text-xs font-semibold text-primary">اضغط للتقييم وعرض التفاصيل</p>
                    ) : (
                      <p className="mt-2 text-xs text-[#8595AD]">عرض التفاصيل والخريطة</p>
                    )}
                  </button>
                ))}
            {!loading && tab === 'past' && (role === 'driver' ? driverRides : past).length === 0 ? (
              <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
                <Clock className="mb-3 size-8 text-[#8595AD]" />
                <p className="text-sm text-[#52627A]">لا توجد رحلات هنا.</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {tab === 'current' && role === 'rider' ? (
        activeRide ? (
          <div className="relative -mx-4 -mt-4 min-h-[calc(100svh-var(--safe-top)-var(--safe-bottom))] overflow-hidden">
            <MapBg src={FIGMA_ASSETS.mapTripProgress} />
            <TripInProgressSheet ride={activeRide} role="rider" />
          </div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#F0F2F5]">
              <Clock className="size-8 text-[#8595AD]" />
            </div>
            <h2 className="text-lg font-bold text-ink">لا توجد رحلة حالية</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#52627A]">ابدأ حجزاً من الخريطة في الرئيسية.</p>
            <Button asChild className="mt-4 rounded-xl">
              <Link to="/app/home">طلب رحلة</Link>
            </Button>
          </div>
        )
      ) : null}

      {tab === 'current' && role === 'driver' ? (
        <div className="mt-4 space-y-2">
          {driverRides
            .filter((r) => ACTIVE.has(r.status))
            .map((r) => (
              <div key={r.id} className="rounded-[16px] border border-[#F0F2F5] bg-white p-3 text-end shadow-sm">
                <p className="text-sm font-semibold">#{r.id} — {r.status}</p>
                <p className="text-xs text-[#52627A]">{r.startAddress}</p>
                <Button asChild variant="link" className="mt-1 h-auto p-0 text-primary">
                  <Link to={`/app/chat?rideId=${r.id}`}>محادثة</Link>
                </Button>
              </div>
            ))}
          {!loading && !driverRides.some((r) => ACTIVE.has(r.status)) ? (
            <p className="py-8 text-center text-sm text-[#52627A]">لا توجد رحلات نشطة ككابتن.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
