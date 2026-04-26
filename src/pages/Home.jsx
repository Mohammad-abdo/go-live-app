import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight, Minus, Plus, Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FIGMA_ASSETS } from '@/lib/figmaAssets'
import { cn } from '@/lib/utils'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage } from '@/lib/apiResponse'
import * as rider from '@/services/riderService'
import TripMapPicker from '@/components/map/TripMapPicker'
import { computeKmBaseEgp, computeTripFareEgp, haversineDistanceKm } from '@/lib/tripFare'

const ink = 'text-[#0A0C0F]'
const muted = 'text-[#52627A]'
const subtle = 'text-[#8595AD]'

const CAIRO = { lat: 30.0444, lng: 31.2357, address: 'القاهرة، مصر' }

/** Vehicle type `price` (or `markup_percent` / `surcharge_percent`) = % added on top of distance × rate. */
function vehicleCategoryMarkupPercent(item) {
  if (!item) return 0
  const n = Number(item.markup_percent ?? item.surcharge_percent ?? item.price)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function offsetPoint(p, dLat, dLng, address) {
  return { lat: p.lat + dLat, lng: p.lng + dLng, address }
}

/** @param {Record<string, unknown>|null|undefined} addr */
function parseAddrPoint(addr) {
  if (!addr) return null
  const lat = parseFloat(String(addr.latitude ?? ''))
  const lng = parseFloat(String(addr.longitude ?? ''))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    lat,
    lng,
    address: String(addr.address || addr.title || '').trim() || 'عنوان محفوظ',
  }
}

function MapBg({ src, className }) {
  const [bad, setBad] = useState(false)
  return (
    <div className={cn('pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-none bg-[#e8eaef]', className)}>
      {!bad ? (
        <img alt="" className="pointer-events-none size-full object-cover" src={src} onError={() => setBad(true)} />
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

function PinCluster() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[38%] z-[5] flex w-5 -translate-x-1/2 flex-col items-center">
      <div className="relative flex size-20 items-center justify-center">
        <div className="absolute size-[50px] rounded-full bg-primary/25" />
        <div className="absolute size-[80px] rounded-full bg-primary/15" />
        <div className="relative flex h-5 w-full items-center justify-center rounded-[10px] bg-primary">
          <span className="size-2 rounded-full bg-white" />
        </div>
      </div>
      <div className="h-2.5 w-px bg-primary/80" />
    </div>
  )
}

function RoutePlanSheet({
  pickup,
  dropoff,
  addresses,
  mapMode,
  onMapModeChange,
  onApplySaved,
  onContinue,
  bootLoading,
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-[50] flex max-h-[52%] flex-col rounded-t-[30px] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.08)]">
      <div className="mx-auto mt-2 h-1 w-12 shrink-0 rounded-full bg-[#e7e9f2]" />
      <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('text-base font-semibold', ink)}>حدّد المسار على الخريطة</p>
          {bootLoading ? <span className="text-xs text-primary">مزامنة…</span> : null}
        </div>

        <p className={cn('text-xs leading-relaxed', muted)}>
          اختر ما تريد تعديله، ثم اضغط على الخريطة لوضع الدبوس، أو اسحب الدبوس الأخضر (انطلاق) والأحمر (وجهة).
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onMapModeChange('pickup')}
            className={cn(
              'flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
              mapMode === 'pickup'
                ? 'border-primary bg-primary/10 text-[#0A0C0F]'
                : 'border-[#E8EAEF] bg-[#fafafa] text-[#52627A]',
            )}
          >
            <span className="me-1 inline-block size-2 rounded-full bg-[#34C759]" aria-hidden />
            الانطلاق
          </button>
          <button
            type="button"
            onClick={() => onMapModeChange('dropoff')}
            className={cn(
              'flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
              mapMode === 'dropoff'
                ? 'border-primary bg-primary/10 text-[#0A0C0F]'
                : 'border-[#E8EAEF] bg-[#fafafa] text-[#52627A]',
            )}
          >
            <span className="me-1 inline-block size-2 rounded-full bg-[#FF3B30]" aria-hidden />
            الوجهة
          </button>
        </div>

        <div className="grid gap-2 rounded-xl border border-[#E8EAEF] bg-[#F6F7FA] p-3">
          <div className="flex items-start justify-between gap-2 text-end">
            <span className="mt-0.5 size-2 shrink-0 rounded-full bg-[#34C759]" aria-hidden />
            <p className={cn('min-w-0 flex-1 text-xs leading-snug', ink)}>{pickup.address}</p>
          </div>
          <div className="flex items-start justify-between gap-2 border-t border-[#e8eaef] pt-2 text-end">
            <span className="mt-0.5 size-2 shrink-0 rounded-full bg-[#FF3B30]" aria-hidden />
            <p className={cn('min-w-0 flex-1 text-xs leading-snug', ink)}>{dropoff.address}</p>
          </div>
        </div>

        {addresses.length ? (
          <button
            type="button"
            className="self-end rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white"
            onClick={onApplySaved}
          >
            تعبئة من أول عنوانين محفوظين
          </button>
        ) : (
          <p className={cn('text-center text-xs', muted)}>
            لا توجد عناوين محفوظة.{' '}
            <Link className="font-semibold text-primary underline-offset-2 hover:underline" to="/app/addresses">
              أضف عنواناً
            </Link>
          </p>
        )}

        <Button className="h-12 w-full rounded-xl text-base font-semibold" type="button" onClick={onContinue}>
          متابعة
        </Button>
      </div>
    </div>
  )
}

function OffersSheet({
  vehicles,
  selectedIdx,
  onSelectIdx,
  fare,
  distanceKm,
  pricePerKm,
  onSearchDrivers,
  onBack,
  loading,
}) {
  const v = vehicles[selectedIdx]
  const nameAr = v?.nameAr || v?.name || 'مركبة'
  const catPct = vehicleCategoryMarkupPercent(v)
  const baseEgp = computeKmBaseEgp(distanceKm, pricePerKm)
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-[50] flex max-h-[78%] flex-col">
      <div className="flex justify-end px-5 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="flex size-8 items-center justify-center rounded-xl bg-white shadow-md"
          aria-label="رجوع"
        >
          <ChevronRight className="size-[18px] text-ink rtl:rotate-180" />
        </button>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden rounded-t-[30px] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.1)]">
        <div className="flex max-h-[min(420px,46vh)] flex-col gap-5 overflow-y-auto px-4 py-4">
          <div className="mx-auto h-1 w-12 rounded-full bg-[#e7e9f2]" />
          {!vehicles.length ? (
            <p className={cn('text-center text-sm', muted)}>لا توجد فئات مركبات لهذه الخدمة في الخادم.</p>
          ) : (
            vehicles.map((item, idx) => {
              const selected = idx === selectedIdx
              const label = item.nameAr || item.name || item.type
              const pct = vehicleCategoryMarkupPercent(item)
              const legFare = computeTripFareEgp(distanceKm, pricePerKm, pct)
              return (
                <button
                  key={item.vehicle_id ?? idx}
                  type="button"
                  onClick={() => onSelectIdx(idx)}
                  className={cn(
                    'flex w-full gap-2 rounded-2xl border p-3 text-end transition-colors',
                    selected ? 'border-primary bg-primary/5' : 'border-[#F0F2F5]',
                  )}
                >
                  <div className="flex shrink-0 flex-col items-end self-center">
                    <p className={cn('text-sm font-semibold tabular-nums', ink)}>E£ {legFare}</p>
                    <p className={cn('text-[10px] tabular-nums', subtle)}>+{pct}%</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', ink)}>{label}</p>
                    <p className={cn('text-xs', muted)}>سعة {item.capacity ?? '—'}</p>
                  </div>
                  {item.image ? (
                    <img src={item.image} alt="" className="h-[60px] w-20 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-[60px] w-20 shrink-0 items-center justify-center rounded-xl bg-[#F0F2F5] text-2xl">
                      🚗
                    </div>
                  )}
                </button>
              )
            })
          )}
          <div className="rounded-[20px] bg-[#F0F2F5] p-1">
            <div className="rounded-[20px] bg-white p-2.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 text-end">
                  <p className={cn('text-sm font-medium', ink)}>الأجرة المقدرة</p>
                  <p className={cn('mt-1 text-2xl font-semibold tabular-nums', ink)}>E£ {fare}</p>
                  <p className={cn('mt-1 text-xs leading-relaxed', muted)}>
                    ≈ {distanceKm.toFixed(1)} كم × {pricePerKm} ج/كم = {baseEgp} ج أساساً
                    {catPct > 0 ? ` · +${catPct}% فئة` : ''}
                  </p>
                </div>
                <div className="flex h-10 w-20 shrink-0 items-center justify-center rounded-xl bg-[#F0F2F5] text-2xl">
                  🚗
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-2 py-3">
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm"
                onClick={() => onSelectIdx(Math.max(0, selectedIdx - 1))}
              >
                <Minus className="size-[18px] text-ink" />
              </button>
              <div className="text-center">
                <p className={cn('text-base font-semibold tabular-nums', ink)}>E£ {fare}</p>
                <p className={cn('text-xs', muted)}>{nameAr}</p>
              </div>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm"
                onClick={() => onSelectIdx(Math.min(vehicles.length - 1, selectedIdx + 1))}
              >
                <Plus className="size-[18px] text-ink" />
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-[#F0F2F5] px-4 pb-1 pt-3">
          <Link
            to="/app/payment"
            className="mb-3 flex items-center justify-between rounded-xl border border-[#F0F2F5] bg-white px-4 py-3 shadow-sm"
          >
            <ChevronRight className="size-4 shrink-0 text-[#52627A] rtl:rotate-180" />
            <span className={cn('min-w-0 flex-1 text-end text-base font-medium', ink)}>E£ {fare} نقداً</span>
            <span className="text-lg" aria-hidden>
              💵
            </span>
          </Link>
          <div className="flex items-center gap-2 pb-3 pt-2">
            <Button
              type="button"
              className="h-12 flex-1 rounded-full text-base font-semibold"
              onClick={onSearchDrivers}
              disabled={loading || !vehicles.length}
            >
              {loading ? 'جاري البحث…' : 'بحث عن سائق'}
            </Button>
            <span className="text-xl" aria-hidden>
              💵
            </span>
          </div>
        </div>
      
      </div>
    </div>
  )
}

function MatchingSheet({ driverCount, onCancelRequest, onPickDrivers }) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-[50] flex max-h-[72%] flex-col rounded-t-[30px] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.1)]">
      <div className="flex flex-col gap-2.5 px-4 pb-2 pt-3">
        <div className="mx-auto h-1 w-12 rounded-full bg-[#e7e9f2]" />
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-row items-center ps-1">
            {Array.from({ length: Math.min(5, driverCount || 1) }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'relative size-6 rounded-full border-2 border-white bg-[#e0e4eb] shadow-sm',
                  i > 0 && '-ms-2',
                )}
              />
            ))}
          </div>
          <p className={cn('text-sm font-semibold', ink)}>
            {driverCount ? `عرض على ${driverCount} سائق` : 'جاري المطابقة'}
          </p>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl bg-white px-4 py-4">
          <p className={cn('text-end text-sm', ink)}>أفضل أجرة — طلبك يحصل على الأولوية ضمن نطاق البحث.</p>
          <div className="h-1 w-full overflow-hidden rounded bg-[#F0F2F5]">
            <div className="h-full w-[84%] rounded bg-primary" />
          </div>
        </div>
        <Button type="button" variant="outline" className="mb-2 h-11 w-full rounded-xl border-primary/40 font-semibold text-primary" onClick={onPickDrivers}>
          اختر سائق
        </Button>
        <button
          type="button"
          onClick={onCancelRequest}
          className="mb-1 flex h-12 w-full items-center justify-center rounded-xl bg-[#F0F2F5]"
        >
          <span className={cn('text-base font-medium', subtle)}>إلغاء الطلب</span>
        </button>
      </div>
  
    </div>
  )
}

function DriverPickCard({ driver, onAccept }) {
  const price = driver.price != null ? `E£ ${driver.price}` : '—'
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-[20px] border-t border-[#e4e4e4] bg-white px-5 py-3 shadow-sm">
      <div className="flex w-full items-center justify-between">
        <p className={cn('text-base', muted)}>قريب</p>
        <p className="text-lg font-semibold text-primary">{price}</p>
      </div>
      <div className="flex items-center justify-end gap-2.5">
        <div className="flex w-[84px] flex-col items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium text-black">{driver.rate ?? '—'}</span>
          </div>
          <div className="flex h-[26px] w-full items-center justify-center rounded-lg bg-[#F0F2F5] text-xs font-medium text-[#7a7c87]">
            {driver.vehicleType || 'مركبة'}
          </div>
        </div>
        <div className="min-w-0 flex-1 text-end">
          <p className="text-base font-medium text-[#111827]">{driver.name || 'سائق'}</p>
          <p className="text-sm text-[#7a7c87]">{driver.vehicleType || ''}</p>
        </div>
        {driver.avatar ? (
          <img src={driver.avatar} alt="" className="size-12 shrink-0 rounded-full object-cover ring-2 ring-white" />
        ) : (
          <div className="size-12 shrink-0 rounded-full bg-[#E0E4EB] ring-2 ring-white" />
        )}
      </div>
      <div className="flex gap-2.5">
        <Button type="button" className="h-12 flex-1 rounded-xl text-base font-medium" onClick={() => onAccept(driver.id)}>
          قبول
        </Button>
        <Button type="button" variant="secondary" className="h-12 flex-1 rounded-xl bg-[#F0F2F5] text-base font-medium text-[#8595AD]">
          تخطي
        </Button>
      </div>
    </div>
  )
}

function SelectDriverSheet({ drivers, onBackToMatching, onAcceptDriver, onCancelFlow }) {
  return (
    <>
      <button
        type="button"
        onClick={onCancelFlow}
        className="pointer-events-auto absolute end-5 top-[calc(var(--safe-top)+0.75rem)] z-[52] flex items-center gap-2 rounded-full border border-[#ff383c]/25 bg-white/95 px-3 py-2 shadow-md"
      >
        <span className="text-base font-medium text-black">إلغاء الطلب</span>
        <X className="size-5 text-[#ff383c]" strokeWidth={2} />
      </button>
      <div className="pointer-events-auto absolute inset-x-0 top-[calc(var(--safe-top)+5rem)] z-[50] flex max-h-[min(560px,calc(100%-var(--safe-top)-6rem))] flex-col gap-3 overflow-y-auto px-3 pb-24">
        <p className={cn('px-2 text-lg font-semibold', ink)}>اختر سائق</p>
        {drivers.map((d) => (
          <DriverPickCard key={d.id} driver={d} onAccept={onAcceptDriver} />
        ))}
        <Button variant="link" className="text-primary" type="button" onClick={onBackToMatching}>
          العودة للمطابقة
        </Button>
      </div>
    </>
  )
}

function CancelSheet({ onContinue, onConfirmCancel }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-[55] flex flex-col justify-end bg-ink/55 backdrop-blur-[2px]">
      <div className="mx-auto w-full max-w-[390px] rounded-t-[24px] bg-white px-5 pb-6 pt-5 shadow-2xl">
        <div className="flex items-start justify-center gap-2">
          <p className={cn('flex-1 text-center text-sm font-bold leading-snug', ink)}>هل أنت متأكد أنك تريد إلغاء طلبك؟</p>
        </div>
        <div className="mx-auto mt-5 flex h-32 max-w-[192px] items-center justify-center rounded-2xl bg-[#F0F2F5] text-5xl">
          🚕
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <Button type="button" className="h-12 rounded-xl text-base font-bold" onClick={onContinue}>
            مواصلة البحث
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl border-red-200 text-base font-bold text-red-600 hover:bg-red-50"
            onClick={onConfirmCancel}
          >
            إلغاء الطلب
          </Button>
        </div>
      </div>
    </div>
  )
}

function FloatingRouteCard({ pickup, dropoff }) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-[calc(var(--safe-top)+0.75rem)] z-[40] w-[350px] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl bg-white p-2.5 shadow-md">
      <div className="flex items-center justify-end gap-2.5 border-b border-transparent py-1">
        <p className={cn('text-sm font-medium', ink)}>{pickup.address}</p>
        <span className="size-2.5 shrink-0 rounded-full bg-[#34C759]" />
      </div>
      <div className="flex items-center justify-end gap-2.5 py-1">
        <Plus className="size-5 shrink-0 text-[#8595AD]" />
        <p className={cn('min-w-0 flex-1 text-end text-sm font-medium', ink)}>{dropoff.address}</p>
        <span className="size-2.5 shrink-0 rounded-full bg-[#FF3B30]" />
      </div>
    </div>
  )
}

function DriverHomePanel() {
  return (
    <div dir="rtl" className="flex min-h-[calc(100svh-env(safe-area-inset-bottom,0px))] flex-col items-center justify-center gap-4 bg-[#f4f6fa] px-6 text-center">
      <p className="text-lg font-semibold text-ink">أنت في وضع الكابتن</p>
      <p className="max-w-sm text-sm leading-relaxed text-[#52627A]">
        طلب الرحلة والخريطة مفعّلان لدور <strong>الراكب</strong> فقط. من حسابي اختر «راكب» إن كان لديك جلسة راكب، ثم ارجع للرئيسية.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild className="rounded-xl">
          <Link to="/app/trips">رحلاتي</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/app/account">حسابي</Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * Rider flow: خطة المسار ← العروض ← مطابقة السائقين ← اختيار سائق (كلها من الـ API عند دور الراكب).
 */
export default function Home() {
  const navigate = useNavigate()
  const role = getActiveRole()

  const [step, setStep] = useState('plan')
  const [cancelOpen, setCancelOpen] = useState(false)

  const [addresses, setAddresses] = useState([])
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState(0)
  const [pickup, setPickup] = useState(CAIRO)
  const [dropoff, setDropoff] = useState(() => offsetPoint(CAIRO, 0.02, 0.02, 'وجهة بالقاهرة'))
  const [mapMode, setMapMode] = useState(/** @type {'pickup' | 'dropoff'} */ ('pickup'))

  const [bookingId, setBookingId] = useState(null)
  const [nearDrivers, setNearDrivers] = useState([])

  /** Bootstrap runs only for rider; drivers skip loading state. */
  const [bootLoading, setBootLoading] = useState(() => getActiveRole() === 'rider')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (role !== 'rider') return
    let cancelled = false
    ;(async () => {
      setBootLoading(true)
      try {
        const [addrRaw, services] = await Promise.all([
          rider.getAddresses().catch(() => []),
          rider.getHomeServices().catch(() => []),
        ])
        if (cancelled) return
        const list = Array.isArray(addrRaw) ? addrRaw : []
        setAddresses(list)
        const svc = Array.isArray(services) && services[0] ? services[0] : null
        const sid = svc?.id ?? null
        let vt = []
        if (sid != null) {
          const raw = await rider.getVehicleTypes(sid).catch(() => [])
          vt = Array.isArray(raw) ? raw : []
        }
        if (cancelled) return
        setVehicleTypes(vt)
        if (list.length >= 2) {
          const pa = parseAddrPoint(list[0])
          const pb = parseAddrPoint(list[1])
          if (pa && pb) {
            setPickup(pa)
            setDropoff(pb)
          } else {
            setPickup(CAIRO)
            setDropoff(offsetPoint(CAIRO, 0.02, 0.02, 'وجهة بالقاهرة (مقترحة)'))
          }
        } else if (list.length === 1) {
          const pa = parseAddrPoint(list[0])
          if (pa) {
            setPickup(pa)
            setDropoff(offsetPoint(pa, 0.02, 0.02, 'وجهة مقترحة'))
          } else {
            setPickup(CAIRO)
            setDropoff(offsetPoint(CAIRO, 0.02, 0.02, 'وجهة بالقاهرة (مقترحة)'))
          }
        } else {
          setPickup(CAIRO)
          setDropoff(offsetPoint(CAIRO, 0.02, 0.02, 'وجهة بالقاهرة (مقترحة)'))
        }
      } catch (e) {
        if (!cancelled) toast.error(getErrorMessage(e))
      } finally {
        if (!cancelled) setBootLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [role])

  const applySavedAddresses = useCallback(() => {
    const a0 = addresses[0]
    const a1 = addresses[1]
    if (!a0 || !a1) {
      toast.message('احفظ عنوانين على الأقل من عناويني')
      return
    }
    const p = parseAddrPoint(a0)
    const d = parseAddrPoint(a1)
    if (!p || !d) {
      toast.error('تأكد أن العناوين تحوي إحداثيات صالحة في الحساب')
      return
    }
    setPickup(p)
    setDropoff(d)
    toast.message('تم تطبيق أول عنوانين')
  }, [addresses])

  const pricePerKm = useMemo(() => {
    const n = Number(import.meta.env.VITE_TRIP_PRICE_PER_KM)
    return Number.isFinite(n) && n > 0 ? n : 8
  }, [])

  const tripDistanceKm = useMemo(
    () => haversineDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng),
    [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng],
  )

  const fare = useMemo(() => {
    const v = vehicleTypes[selectedVehicleIdx]
    return computeTripFareEgp(tripDistanceKm, pricePerKm, vehicleCategoryMarkupPercent(v))
  }, [vehicleTypes, selectedVehicleIdx, tripDistanceKm, pricePerKm])

  const mapSrc = useMemo(() => {
    if (step === 'plan') return FIGMA_ASSETS.mapRoutePlan
    if (step === 'offers') return FIGMA_ASSETS.mapOffers
    if (step === 'drivers') return FIGMA_ASSETS.mapSelectDriver
    return FIGMA_ASSETS.mapMatching
  }, [step])

  const goOffers = useCallback(() => {
    if (!pickup || !dropoff) {
      toast.error('حدد نقطة الانطلاق والوجهة')
      return
    }
    setStep('offers')
  }, [pickup, dropoff])

  const goPlan = useCallback(() => setStep('plan'), [])

  const searchDrivers = useCallback(async () => {
    const v = vehicleTypes[selectedVehicleIdx]
    if (!v?.vehicle_id) {
      toast.error('اختر نوع المركبة')
      return
    }
    setActionLoading(true)
    try {
      const created = await rider.createBooking({
        vehicle_id: v.vehicle_id,
        paymentMethod: 'cash',
        from: { lat: pickup.lat, lng: pickup.lng, address: pickup.address },
        to: { lat: dropoff.lat, lng: dropoff.lng, address: dropoff.address },
      })
      const bid = created?.booking_id
      if (bid == null) {
        toast.error('لم يُرجع الخادم رقم الحجز')
        return
      }
      setBookingId(bid)
      const { ok, drivers, message } = await rider.getNearDrivers({
        booking_id: bid,
        booking_location: { lat: pickup.lat, lng: pickup.lng },
      })
      if (!ok || !drivers.length) {
        const backendMsg = message || 'لا يوجد سائقون متاحون ضمن النطاق'
        toast.error(
          `${backendMsg} جرّب نقطة انطلاق أقرب لمنطقة فيها كباتن، أو راجع إعدادات نطاق البحث في الخادم (radius_km).`,
        )
        await rider.cancelTrip({ booking_id: bid }).catch(() => {})
        setBookingId(null)
        return
      }
      setNearDrivers(drivers)
      setStep('matching')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setActionLoading(false)
    }
  }, [vehicleTypes, selectedVehicleIdx, pickup, dropoff])

  const goDrivers = useCallback(() => setStep('drivers'), [])

  const acceptDriver = useCallback(
    async (driverId) => {
      if (!bookingId) return
      setActionLoading(true)
      try {
        await rider.acceptDriver({ driver_id: driverId, booking_id: bookingId })
        toast.success('تم قبول السائق')
        navigate('/app/trips', { replace: false, state: { highlightBookingId: bookingId } })
      } catch (e) {
        toast.error(getErrorMessage(e))
      } finally {
        setActionLoading(false)
      }
    },
    [bookingId, navigate],
  )

  const confirmCancelTrip = useCallback(async () => {
    setCancelOpen(false)
    if (bookingId) {
      try {
        await rider.cancelTrip({ booking_id: bookingId })
        toast.message('تم إلغاء الطلب')
      } catch (e) {
        toast.error(getErrorMessage(e))
      }
    }
    setBookingId(null)
    setNearDrivers([])
    setStep('offers')
  }, [bookingId])

  const cancelFlow = useCallback(async () => {
    if (bookingId) {
      try {
        await rider.cancelTrip({ booking_id: bookingId })
      } catch {
        /* ignore */
      }
    }
    setBookingId(null)
    setNearDrivers([])
    setStep('plan')
  }, [bookingId])

  if (role === 'driver') {
    return <DriverHomePanel />
  }

  return (
    <div
      dir="rtl"
      className="relative min-h-[calc(100svh-env(safe-area-inset-bottom,0px))] overflow-hidden bg-[#e8eaef]"
    >
      {step === 'plan' ? (
        <TripMapPicker
          className="absolute inset-0 z-0 min-h-[calc(100svh-env(safe-area-inset-bottom,0px))]"
          pickup={pickup}
          dropoff={dropoff}
          mapMode={mapMode}
          onPickupChange={setPickup}
          onDropoffChange={setDropoff}
        />
      ) : (
        <MapBg src={mapSrc} />
      )}
      {step === 'drivers' ? <div className="pointer-events-none absolute inset-0 z-[1] bg-black/25" aria-hidden /> : null}
      {step !== 'plan' && step !== 'drivers' ? <FloatingRouteCard pickup={pickup} dropoff={dropoff} /> : null}
      {step !== 'plan' && step !== 'drivers' ? <PinCluster /> : null}

      {step === 'plan' ? (
        <RoutePlanSheet
          pickup={pickup}
          dropoff={dropoff}
          addresses={addresses}
          mapMode={mapMode}
          onMapModeChange={setMapMode}
          onApplySaved={applySavedAddresses}
          onContinue={goOffers}
          bootLoading={bootLoading}
        />
      ) : null}
      {step === 'offers' ? (
        <OffersSheet
          vehicles={vehicleTypes}
          selectedIdx={selectedVehicleIdx}
          onSelectIdx={setSelectedVehicleIdx}
          fare={fare}
          distanceKm={tripDistanceKm}
          pricePerKm={pricePerKm}
          onSearchDrivers={searchDrivers}
          onBack={goPlan}
          loading={actionLoading}
        />
      ) : null}
      {step === 'matching' ? (
        <MatchingSheet
          driverCount={nearDrivers.length}
          onPickDrivers={goDrivers}
          onCancelRequest={() => setCancelOpen(true)}
        />
      ) : null}
      {step === 'drivers' ? (
        <SelectDriverSheet
          drivers={nearDrivers}
          onBackToMatching={() => setStep('matching')}
          onAcceptDriver={acceptDriver}
          onCancelFlow={cancelFlow}
        />
      ) : null}

      {cancelOpen ? (
        <CancelSheet
          onContinue={() => setCancelOpen(false)}
          onConfirmCancel={confirmCancelTrip}
        />
      ) : null}
    </div>
  )
}
