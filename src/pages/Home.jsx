import { useCallback, useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight, LocateFixed, Minus, Plus, Star, Ticket, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FIGMA_ASSETS } from '@/lib/figmaAssets'
import { cn } from '@/lib/utils'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage } from '@/lib/apiResponse'
import * as rider from '@/services/riderService'
import TripMapPicker from '@/components/map/TripMapPicker'
import DriverHome from '@/pages/driver/DriverHome'
import { resolveMediaUrl } from '@/lib/resolveMediaUrl'
import {
  computeFallbackDistanceOnlyFare,
  computeFareFromPricingRule,
  haversineDistanceKm,
} from '@/lib/tripFare'
import { geocodeFirstHit, reverseGeocode } from '@/lib/osmGeocode'

const ink = 'text-[#0A0C0F]'
const muted = 'text-[#52627A]'
const subtle = 'text-[#8595AD]'

const CAIRO = { lat: 30.0444, lng: 31.2357, address: 'القاهرة، مصر' }

/** Coerce API rule fields (strings / Decimals) for distance-based fare. */
function normalizePricingRule(rule) {
  if (!rule || typeof rule !== 'object') return null
  return {
    baseFare: Number(rule.baseFare) || 0,
    minimumFare: Number(rule.minimumFare) || 0,
    baseDistance: Number(rule.baseDistance) > 0 ? Number(rule.baseDistance) : 5,
    perDistanceAfterBase: Number(rule.perDistanceAfterBase) || 0,
  }
}

/** Uses admin `pricingRule` from vehicle-types API; env EGP/km only if rule missing. */
function estimateVehicleFare(vehicle, distanceKm) {
  const fromRule = computeFareFromPricingRule(distanceKm, normalizePricingRule(vehicle?.pricingRule))
  if (fromRule != null) return fromRule
  const n = Number(import.meta.env.VITE_TRIP_PRICE_PER_KM)
  const per = Number.isFinite(n) && n > 0 ? n : 8
  return computeFallbackDistanceOnlyFare(distanceKm, per)
}

function hasDashboardPricingRule(v) {
  return v?.pricingRule != null && typeof v.pricingRule === 'object'
}

function offsetPoint(p, dLat, dLng, address) {
  return { lat: p.lat + dLat, lng: p.lng + dLng, address }
}

function formatCoordsFallback(lat, lng) {
  return `موقعي الحالي (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`
}

function geolocationTryOnce(options) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      options,
    )
  })
}

/** GPS: accurate pass then faster low-accuracy pass (mobile / Safari friendly). */
async function readGeolocationPreferred() {
  let c = await geolocationTryOnce({
    enableHighAccuracy: true,
    maximumAge: 30_000,
    timeout: 12_000,
  })
  if (c) return c
  c = await geolocationTryOnce({
    enableHighAccuracy: false,
    maximumAge: 0,
    timeout: 28_000,
  })
  return c
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

/** inDrive-style pulse while we query captains (shown on matching + while offers search runs). */
function SearchRadarPulse({ label = 'جاري البحث عن أقرب الكباتن' }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[4] flex items-end justify-center pb-[min(42%,14rem)]">
      <div className="relative flex size-28 items-center justify-center">
        <div
          className="absolute size-[7.5rem] rounded-full bg-primary/25"
          style={{ animation: 'go-radar 2.4s ease-out infinite' }}
        />
        <div
          className="absolute size-[10.5rem] rounded-full bg-primary/18"
          style={{ animation: 'go-radar 2.4s ease-out infinite', animationDelay: '0.5s' }}
        />
        <div
          className="absolute size-[13.5rem] rounded-full bg-primary/12"
          style={{ animation: 'go-radar 2.4s ease-out infinite', animationDelay: '1s' }}
        />
        <div className="relative z-[1] max-w-[11rem] rounded-2xl border border-white/90 bg-white/95 px-3 py-2 text-center shadow-lg backdrop-blur-sm">
          <p className="text-xs font-bold text-primary">{label}</p>
        </div>
      </div>
      <style>{`@keyframes go-radar{0%{transform:scale(0.35);opacity:0.9}70%{opacity:0.35}100%{transform:scale(1);opacity:0}}`}</style>
    </div>
  )
}

function SpinnerOnMap({ label, sub }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center">
      <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-center shadow-lg backdrop-blur-sm">
        <div className="mx-auto mb-2 size-7 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <p className="text-xs font-bold text-primary">{label}</p>
        {sub ? <p className="mt-0.5 text-[11px] font-semibold text-[#52627A]">{sub}</p> : null}
      </div>
    </div>
  )
}

function hasNegotiationOffer(d) {
  if (!d || typeof d !== 'object') return false
  const bid = d.bid_amount ?? d.bidAmount ?? d.proposedFare ?? d.proposed_fare ?? d.negotiated_fare
  if (bid != null && Number(bid) > 0) return true
  if (d.is_negotiating === true || d.isNegotiating === true) return true
  const ns = String(d.negotiation_status ?? d.negotiationStatus ?? d.status ?? '').toLowerCase()
  if (ns.includes('negotiat')) return true
  return false
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
  tripDistanceKm,
  onUseMyLocation,
  locationBusy,
  onPickupPatch,
  onDropoffPatch,
  onRequestMapRecenter,
}) {
  const [geoPickBusy, setGeoPickBusy] = useState(false)
  const [geoDropBusy, setGeoDropBusy] = useState(false)

  const runGeocodePickup = async () => {
    setGeoPickBusy(true)
    try {
      const hit = await geocodeFirstHit(pickup.address)
      if (!hit) {
        toast.error('لم يُعثر على عنوان الانطلاق. صغّح النص أو ضع الدبوس على الخريطة.')
        return
      }
      onPickupPatch(hit)
      onRequestMapRecenter?.()
      toast.success('تم تحديث نقطة الانطلاق من البحث')
    } finally {
      setGeoPickBusy(false)
    }
  }

  const runGeocodeDropoff = async () => {
    setGeoDropBusy(true)
    try {
      const hit = await geocodeFirstHit(dropoff.address)
      if (!hit) {
        toast.error('لم يُعثر على الوجهة. صغّح النص أو ضع الدبوس على الخريطة.')
        return
      }
      onDropoffPatch(hit)
      onRequestMapRecenter?.()
      toast.success('تم تحديث الوجهة من البحث')
    } finally {
      setGeoDropBusy(false)
    }
  }

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-[50] flex max-h-[56%] flex-col rounded-t-[30px] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.08)]">
      <div className="mx-auto mt-2 h-1 w-12 shrink-0 rounded-full bg-[#e7e9f2]" />
      <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('text-base font-semibold', ink)}>حدّد المسار على الخريطة</p>
          {bootLoading ? <span className="text-xs text-primary">مزامنة…</span> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8EAEF] bg-[#fafafa] px-3 py-2">
          <span className={cn('text-xs font-semibold tabular-nums text-primary')}>
            ≈ {Number(tripDistanceKm).toFixed(1)} كم بين الانطلاق والوجهة
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-full border-primary/30 px-3 text-xs font-semibold text-primary"
            disabled={locationBusy}
            onClick={onUseMyLocation}
          >
            <LocateFixed className="size-3.5 shrink-0" />
            {locationBusy ? 'جاري الموقع…' : 'موقعي GPS'}
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[#52627A]">عنوان الانطلاق (اكتب ثم بحث أو حرّك الدبوس)</Label>
          <div className="flex gap-2">
            <Input
              dir="rtl"
              value={pickup.address}
              onChange={(e) => onPickupPatch({ address: e.target.value })}
              className="h-11 flex-1 rounded-xl border-[#E8EAEF] text-end"
              placeholder="مثال: ميدان التحرير، القاهرة"
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 rounded-xl px-3 text-xs font-semibold"
              disabled={geoPickBusy}
              onClick={() => void runGeocodePickup()}
            >
              {geoPickBusy ? '…' : 'بحث'}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[#52627A]">الوجهة (اكتب ثم بحث أو حرّك الدبوس الأحمر)</Label>
          <div className="flex gap-2">
            <Input
              dir="rtl"
              value={dropoff.address}
              onChange={(e) => onDropoffPatch({ address: e.target.value })}
              className="h-11 flex-1 rounded-xl border-[#E8EAEF] text-end"
              placeholder="مثال: مطار القاهرة، ترمينال 2"
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 rounded-xl px-3 text-xs font-semibold"
              disabled={geoDropBusy}
              onClick={() => void runGeocodeDropoff()}
            >
              {geoDropBusy ? '…' : 'بحث'}
            </Button>
          </div>
        </div>

        <p className={cn('text-xs leading-relaxed', muted)}>
          اختر ما تريد تعديله، ثم اضغط على الخريطة لوضع الدبوس، أو اسحب الدبوس الأخضر (انطلاق) والأحمر (وجهة). فعّل صلاحية الموقع للمتصفح إن طُلب منك.
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
  fallbackPerKm,
  onSearchDrivers,
  onBack,
  loading,
}) {
  const v = vehicles[selectedIdx]
  const nameAr = v?.nameAr || v?.name || 'مركبة'
  const rule = v?.pricingRule
  const baseDist = rule && Number(rule.baseDistance) > 0 ? Number(rule.baseDistance) : 5
  const extraKm = Math.max(0, distanceKm - baseDist)
  const breakdownLine = rule
    ? `أساس ${Number(rule.baseFare).toFixed(0)} ج + ${extraKm.toFixed(1)} كم × ${Number(rule.perDistanceAfterBase).toFixed(1)} ج/كم (بعد ${baseDist} كم)${
        Number(rule.minimumFare) > 0 ? ` · حد أدنى ${Number(rule.minimumFare).toFixed(0)} ج` : ''
      }`
    : `≈ ${distanceKm.toFixed(1)} كم × ${fallbackPerKm} ج/كم (تقدير بدون قاعدة تسعير)`
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
          <Link
            to="/app/payment"
            className="flex items-center justify-between rounded-xl border border-dashed border-primary/25 bg-primary/[0.04] px-3 py-2.5"
          >
            <ChevronRight className="size-4 shrink-0 text-primary/70 rtl:rotate-180" />
            <span className={cn('min-w-0 flex-1 text-end text-sm font-semibold text-primary')}>
              هل لديك كود ترويجي؟ استخدمه هنا
            </span>
            <Ticket className="size-5 shrink-0 text-primary" />
          </Link>
          <p className={cn('-mt-2 text-end text-xs font-bold text-ink')}>رحلات بأجرة معقولة</p>
          {!vehicles.length ? (
            <p className={cn('text-center text-sm', muted)}>لا توجد فئات مركبات لهذه الخدمة في الخادم.</p>
          ) : (
            vehicles.map((item, idx) => {
              const selected = idx === selectedIdx
              const label = item.nameAr || item.name || item.type
              const legFare = estimateVehicleFare(item, distanceKm)
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
                    {hasDashboardPricingRule(item) ? (
                      <p className={cn('max-w-[8rem] text-[10px] leading-tight text-primary/90')}>تسعير كم + لوحة التحكم</p>
                    ) : (
                      <p className={cn('max-w-[8rem] text-[10px] leading-tight text-amber-800/90')}>كم فقط (لا قاعدة في الـ API)</p>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', ink)}>{label}</p>
                    <p className={cn('text-xs', muted)}>سعة {item.capacity ?? '—'}</p>
                  </div>
                  {item.image ? (
                    <img
                      src={resolveMediaUrl(item.image)}
                      alt=""
                      className="h-[60px] w-20 shrink-0 rounded-xl object-cover"
                    />
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
                  <p className={cn('text-sm font-medium', ink)}>الأجرة المقدرة (حسب المسافة)</p>
                  <p className={cn('mt-1 text-2xl font-semibold tabular-nums', ink)}>E£ {fare}</p>
                  <p className={cn('mt-0.5 text-[11px] font-medium text-primary/90')}>
                    ليست «سعر الفئة» الثابت — المحسوبة من {distanceKm.toFixed(1)} كم
                  </p>
                  <p className={cn('mt-1 text-xs leading-relaxed', muted)}>{breakdownLine}</p>
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
              className="h-12 flex-1 rounded-full border-0 bg-cta text-base font-bold text-cta-foreground shadow-md transition hover:bg-cta/90"
              onClick={onSearchDrivers}
              disabled={loading || !vehicles.length}
            >
              {loading ? 'جاري البحث…' : 'البحث عن عروض'}
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

function MatchingSheet({
  driverCount,
  driverPreview,
  bookingMeta,
  onCancelRequest,
  onPickDrivers,
  estimatedFare,
  distanceKm,
}) {
  const nd = bookingMeta?.negotiating_driver_id
  const nf = bookingMeta?.negotiated_fare
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
        {nd != null && nf != null ? (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-900">
            سائق يقترح سعراً: <span className="tabular-nums">E£ {nf}</span> — افتح «اختر سائق» للقبول أو اختر سائقاً آخر.
          </div>
        ) : null}
        {Array.isArray(driverPreview) && driverPreview.length > 0 ? (
          <div className="max-h-[140px] space-y-1.5 overflow-y-auto rounded-xl border border-[#F0F2F5] bg-[#FAFBFC] px-3 py-2">
            <p className={cn('text-[11px] font-bold', ink)}>أقرب السائقين والأسعار</p>
            {driverPreview.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 text-end text-xs">
                <span className="shrink-0 font-bold tabular-nums text-primary">
                  E£ {d.display_price ?? d.price ?? estimatedFare}
                  {d.bid_amount != null ? (
                    <span className="me-1 text-[10px] font-semibold text-emerald-700">عرض</span>
                  ) : null}
                  {d.is_negotiating ? (
                    <span className="me-1 text-[10px] font-semibold text-amber-800">تفاوض</span>
                  ) : null}
                </span>
                <span className="min-w-0 truncate text-[#3d4553]">
                  {d.name || 'سائق'}
                  {d.distance_km != null ? (
                    <span className="ms-1 tabular-nums text-[#8595AD]">· {d.distance_km} كم</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex flex-col gap-4 rounded-2xl bg-white px-4 py-4">
          <p className={cn('text-end text-sm', ink)}>
            البحث عن أقرب الكباتن ضمن النطاق. تقدير الرحلة الحالي:{' '}
            <span className="font-bold text-primary tabular-nums">E£ {estimatedFare}</span> —{' '}
            <span className="tabular-nums">{Number(distanceKm).toFixed(1)} كم</span>
          </p>
          <p className={cn('text-end text-[11px] leading-relaxed', muted)}>
            يتحدّث السائقون مع السعر عبر «عرض» أو «تفاوض»؛ القائمة تُحدَّث كل بضع ثوانٍ.
          </p>
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

function DriverPickCard({ driver, tripFareEstimate, distanceKm, onAccept }) {
  const display = driver.display_price ?? driver.price ?? tripFareEstimate
  const base = driver.price ?? tripFareEstimate
  const hasOffer = driver.bid_amount != null || driver.is_negotiating || Number(display) !== Number(base)
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-[20px] border-t border-[#e4e4e4] bg-white px-5 py-3 shadow-sm">
      <div className="flex w-full items-center justify-between gap-2">
        <p className={cn('text-xs', muted)}>{hasOffer ? 'السعر المعروض' : 'تقدير الرحلة'}</p>
        <div className="text-end">
          <p className="text-lg font-semibold text-primary tabular-nums">E£ {display}</p>
          {hasOffer ? (
            <p className={cn('text-[10px] leading-tight', muted)}>
              أساس التطبيق: E£ {base}
              {driver.bid_amount != null ? ' · عرض سائق' : ''}
              {driver.is_negotiating ? ' · تفاوض' : ''}
            </p>
          ) : (
            <p className={cn('text-[10px] leading-tight', muted)}>{Number(distanceKm).toFixed(1)} كم · نفس مركبتك المختارة</p>
          )}
          {driver.distance_km != null ? (
            <p className={cn('text-[10px] font-medium text-primary/80', muted)}>يبعد حوالي {driver.distance_km} كم</p>
          ) : null}
        </div>
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
          <img
            src={resolveMediaUrl(driver.avatar)}
            alt=""
            className="size-12 shrink-0 rounded-full object-cover ring-2 ring-white"
          />
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

function SelectDriverSheet({
  drivers,
  tripFareEstimate,
  distanceKm,
  bookingMeta,
  onBackToMatching,
  onAcceptDriver,
  onCancelFlow,
}) {
  const nd = bookingMeta?.negotiating_driver_id
  const nf = bookingMeta?.negotiated_fare
  const negDriver = nd != null ? drivers.find((d) => Number(d.id) === Number(nd)) : null
  const negName = negDriver?.name || 'السائق'
  return (
    <>
      <button
        type="button"
        onClick={onCancelFlow}
        className="pointer-events-auto absolute start-5 top-[calc(var(--safe-top)+0.75rem)] z-[52] flex items-center gap-2 rounded-full border border-[#ff383c]/25 bg-white/95 px-3 py-2 shadow-md"
      >
        <span className="text-base font-medium text-black">إلغاء الطلب</span>
        <X className="size-5 text-[#ff383c]" strokeWidth={2} />
      </button>
      <div className="pointer-events-auto absolute inset-x-0 top-[calc(var(--safe-top)+5rem)] z-[50] flex max-h-[min(560px,calc(100%-var(--safe-top)-6rem))] flex-col gap-3 overflow-y-auto px-3 pb-24">
        <p className={cn('px-2 text-lg font-semibold', ink)}>اختر سائق</p>
        {nd != null && nf != null ? (
          <div className="mx-2 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-white px-4 py-3 shadow-sm">
            <p className="text-center text-[11px] font-bold uppercase tracking-wide text-amber-900/80">عرض تفاوض</p>
            <p className="mt-1 text-center text-2xl font-black tabular-nums text-amber-950">
              E£ {nf}
            </p>
            <p className="mt-1 text-center text-xs leading-relaxed text-amber-950/90">
              {negDriver
                ? `${negName} — السعر المعروض في بطاقته أدناه؛ اضغط قبول لاعتماد هذا السائق.`
                : `${negName} يعرض هذا السعر — سيظهر في القائمة عند التحديث؛ يمكنك قبوله من البطاقة.`}
            </p>
          </div>
        ) : null}
        <p className={cn('px-2 text-xs leading-relaxed', muted)}>
          كل بطاقة تعرض <strong className="text-ink">السعر المعروض</strong> (تقدير الرحلة، أو عرض/تفاوض من السائق إن وُجد).
        </p>
        {!drivers.length && nd != null && nf != null ? (
          <div className="mx-2 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-950">
            سائق يعرض سعر تفاوض <span className="tabular-nums">E£ {nf}</span>. اضغط «تحديث القائمة» أو ارجع للمطابقة حتى يظهر في القائمة، ثم اضغط قبول.
            <div className="mt-3 flex flex-col gap-2">
              <Button type="button" className="h-11 rounded-xl" variant="outline" onClick={onBackToMatching}>
                تحديث القائمة (العودة للمطابقة)
              </Button>
            </div>
          </div>
        ) : null}
        {!drivers.length && !(nd != null && nf != null) ? (
          <div className="mx-2 rounded-2xl border border-[#E8EAEF] bg-[#fafafa] px-4 py-6 text-center text-sm text-[#52627A]">
            لا يوجد كباتن ضمن النطاق حالياً. جرّب توسيع البحث من الخادم أو غيّر نقطة الانطلاق.
          </div>
        ) : null}
        {drivers.map((d) => (
          <DriverPickCard
            key={d.id}
            driver={d}
            tripFareEstimate={tripFareEstimate}
            distanceKm={distanceKm}
            onAccept={onAcceptDriver}
          />
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
  /** Online captains near pickup pin on plan step (no booking) — from `POST /map/nearby-drivers`. */
  const [mapPreviewDrivers, setMapPreviewDrivers] = useState([])
  /** @type {null | { id?: number, base_fare?: number, status?: string, negotiation_status?: string, negotiating_driver_id?: number|null, negotiated_fare?: number|null }} */
  const [bookingOfferMeta, setBookingOfferMeta] = useState(null)

  // Progressive radius expansion (Uber-like search widening)
  const [searchRadiusKm, setSearchRadiusKm] = useState(5)
  const [searchStage, setSearchStage] = useState(0)
  const [searchStartedAt, setSearchStartedAt] = useState(0)
  const [radiusHint, setRadiusHint] = useState(null)

  /** Bootstrap runs only for rider; drivers skip loading state. */
  const [bootLoading, setBootLoading] = useState(() => getActiveRole() === 'rider')
  const [actionLoading, setActionLoading] = useState(false)
  const [locationBusy, setLocationBusy] = useState(false)
  const [mapRecenterTick, setMapRecenterTick] = useState(0)
  const bumpMapRecenter = useCallback(() => {
    setMapRecenterTick((n) => n + 1)
  }, [])

  const applyDeviceLocation = useCallback(async () => {
    setLocationBusy(true)
    try {
      const coords = await readGeolocationPreferred()
      if (!coords) {
        toast.message('تعذر قراءة الموقع. اسمح للمتصفح بالوصول للموقع، أو ضع الدبوس على الخريطة.')
        return
      }
      const pickupHit = await reverseGeocode(coords.lat, coords.lng)
      const pickupPoint = {
        lat: coords.lat,
        lng: coords.lng,
        address: pickupHit?.address || formatCoordsFallback(coords.lat, coords.lng),
      }
      const drop = offsetPoint(pickupPoint, 0.02, 0.02, 'وجهة مقترحة')
      const dropHit = await reverseGeocode(drop.lat, drop.lng)
      setPickup(pickupPoint)
      setDropoff({
        ...drop,
        address: dropHit?.address || drop.address,
      })
      setMapMode('pickup')
      bumpMapRecenter()
      toast.success('تم ضبط الانطلاق من موقعك')
    } finally {
      setLocationBusy(false)
    }
  }, [bumpMapRecenter])

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

        const p0 = list[0] ? parseAddrPoint(list[0]) : null
        const p1 = list[1] ? parseAddrPoint(list[1]) : null
        const twoValidSaved = Boolean(p0 && p1)

        if (twoValidSaved) {
          setPickup(p0)
          setDropoff(p1)
        } else if (p0 && !p1) {
          setPickup(p0)
          setDropoff(offsetPoint(p0, 0.02, 0.02, 'وجهة مقترحة'))
        } else {
          setPickup(CAIRO)
          setDropoff(offsetPoint(CAIRO, 0.02, 0.02, 'وجهة بالقاهرة (مقترحة)'))
        }

        /** GPS when we do not have two saved points with coordinates (includes 0 or 1 rows, or invalid coords). */
        if (!cancelled && !twoValidSaved) {
          const coords = await readGeolocationPreferred()
          if (!cancelled && coords) {
            const pickupHit = await reverseGeocode(coords.lat, coords.lng)
            const pickupPoint = {
              lat: coords.lat,
              lng: coords.lng,
              address: pickupHit?.address || formatCoordsFallback(coords.lat, coords.lng),
            }
            const drop = offsetPoint(pickupPoint, 0.02, 0.02, 'وجهة مقترحة')
            const dropHit = await reverseGeocode(drop.lat, drop.lng)
            if (cancelled) return
            setPickup(pickupPoint)
            setDropoff({ ...drop, address: dropHit?.address || drop.address })
            bumpMapRecenter()
          }
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
  }, [role, bumpMapRecenter])

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

  const fallbackPerKm = useMemo(() => {
    const n = Number(import.meta.env.VITE_TRIP_PRICE_PER_KM)
    return Number.isFinite(n) && n > 0 ? n : 8
  }, [])

  const tripDistanceKm = useMemo(
    () => haversineDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng),
    [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng],
  )

  const fare = useMemo(() => {
    const v = vehicleTypes[selectedVehicleIdx]
    return estimateVehicleFare(v, tripDistanceKm)
  }, [vehicleTypes, selectedVehicleIdx, tripDistanceKm])

  const mapSrc = useMemo(() => {
    if (step === 'offers') return FIGMA_ASSETS.mapOffers
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
      setStep('matching')
      setSearchRadiusKm(5)
      setSearchStage(0)
      setSearchStartedAt(Date.now())
      toast.message('جاري البحث عن سائقين قريبين…')
      // First pull immediately (do NOT cancel booking if none found — we widen gradually)
      void rider
        .getNearDrivers({
          booking_id: bid,
          booking_location: { lat: pickup.lat, lng: pickup.lng },
          radius_km: 5,
        })
        .then(({ ok, drivers, booking: bookingSnap }) => {
          if (ok && Array.isArray(drivers)) setNearDrivers(drivers)
          if (bookingSnap && typeof bookingSnap === 'object') setBookingOfferMeta(bookingSnap)
        })
        .catch(() => {})
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setActionLoading(false)
    }
  }, [vehicleTypes, selectedVehicleIdx, pickup, dropoff])

  const refreshNearDrivers = useCallback(async () => {
    if (!bookingId || !pickup) return
    try {
      const { ok, drivers, booking: bookingSnap } = await rider.getNearDrivers({
        booking_id: bookingId,
        booking_location: { lat: pickup.lat, lng: pickup.lng },
        radius_km: searchRadiusKm,
      })
      if (bookingSnap && String(bookingSnap.status) === 'cancelled') {
        setNearDrivers([])
        setBookingOfferMeta(bookingSnap)
        return
      }
      if (ok && Array.isArray(drivers) && drivers.length) {
        setNearDrivers(drivers)
        if (bookingSnap && typeof bookingSnap === 'object') setBookingOfferMeta(bookingSnap)
        return
      }
      if (
        !ok &&
        bookingSnap &&
        String(bookingSnap.status) === 'negotiating' &&
        bookingSnap.negotiating_driver_id != null
      ) {
        if (typeof bookingSnap === 'object') setBookingOfferMeta(bookingSnap)
      }
    } catch {
      /* keep list */
    }
  }, [bookingId, pickup, searchRadiusKm])

  // Expand search radius gradually while matching (even if no drivers yet)
  useEffect(() => {
    if (step !== 'matching' || !bookingId) return
    const stages = [5, 8, 12, 18, 25, 35, 50]
    const cap = Number(import.meta.env.VITE_NEAR_DRIVER_SEARCH_MAX_RADIUS_KM || 50)
    const max = Number.isFinite(cap) && cap > 5 ? Math.min(80, cap) : 50

    const t = window.setInterval(() => {
      const elapsed = searchStartedAt ? Date.now() - searchStartedAt : 0
      // increase every ~12s if still no offers
      const offered = nearDrivers.filter(hasNegotiationOffer)
      if (offered.length) return
      if (elapsed < 10_000) return
      const nextIdx = Math.min(stages.length - 1, searchStage + 1)
      const next = Math.min(max, stages[nextIdx] || searchRadiusKm)
      if (next > searchRadiusKm) {
        setSearchStage(nextIdx)
        setSearchRadiusKm(next)
        setRadiusHint(`تم توسيع النطاق إلى ${next} كم`)
      }
    }, 2500)

    return () => window.clearInterval(t)
  }, [step, bookingId, nearDrivers, searchStage, searchRadiusKm, searchStartedAt])

  useEffect(() => {
    if (!radiusHint) return
    const t = window.setTimeout(() => setRadiusHint(null), 3200)
    return () => window.clearTimeout(t)
  }, [radiusHint])

  const offeredDrivers = useMemo(() => {
    // Only show drivers who sent negotiation/offer price.
    return (Array.isArray(nearDrivers) ? nearDrivers : []).filter(hasNegotiationOffer)
  }, [nearDrivers])

  const refreshMapPreviewDrivers = useCallback(async () => {
    if (role !== 'rider') return
    try {
      const { ok, drivers } = await rider.getMapNearbyDriversPreview({
        lat: pickup.lat,
        lng: pickup.lng,
      })
      if (ok && Array.isArray(drivers)) setMapPreviewDrivers(drivers)
      else setMapPreviewDrivers([])
    } catch {
      setMapPreviewDrivers([])
    }
  }, [role, pickup.lat, pickup.lng])

  useEffect(() => {
    if (role !== 'rider' || step !== 'plan') return undefined
    const first = window.setTimeout(() => {
      void refreshMapPreviewDrivers()
    }, 0)
    const t = window.setInterval(refreshMapPreviewDrivers, 22000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(t)
    }
  }, [role, step, refreshMapPreviewDrivers])

  const goDrivers = useCallback(() => {
    setStep('drivers')
    window.setTimeout(() => {
      refreshNearDrivers()
    }, 0)
  }, [refreshNearDrivers])

  useEffect(() => {
    if ((step !== 'matching' && step !== 'drivers') || !bookingId) return undefined
    const first = window.setTimeout(() => {
      refreshNearDrivers()
    }, 0)
    const t = setInterval(refreshNearDrivers, 5000)
    return () => {
      window.clearTimeout(first)
      clearInterval(t)
    }
  }, [step, bookingId, refreshNearDrivers])

  const acceptDriver = useCallback(
    async (driverId) => {
      if (!bookingId) return
      setActionLoading(true)
      try {
        await rider.acceptDriver({ driver_id: driverId, booking_id: bookingId })
        toast.success('تم قبول السائق')
        navigate(`/app/trip/${bookingId}`, { replace: false })
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
    if (!bookingId) {
      setNearDrivers([])
      setBookingOfferMeta(null)
      setStep('offers')
      return
    }
    const id = bookingId
    try {
      await rider.cancelTrip({ booking_id: id })
      toast.message('تم إلغاء الطلب')
      setBookingId(null)
      setNearDrivers([])
      setBookingOfferMeta(null)
      setStep('offers')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [bookingId])

  const cancelFlow = useCallback(async () => {
    if (!bookingId) {
      setNearDrivers([])
      setBookingOfferMeta(null)
      setStep('plan')
      return
    }
    const id = bookingId
    try {
      await rider.cancelTrip({ booking_id: id })
      setBookingId(null)
      setNearDrivers([])
      setBookingOfferMeta(null)
      setStep('plan')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [bookingId])

  if (role === 'driver') {
    return <DriverHome />
  }

  return (
    <div
      dir="rtl"
      className="relative min-h-[calc(100svh-env(safe-area-inset-bottom,0px))] overflow-hidden bg-[#e8eaef]"
    >
      {step === 'plan' || step === 'matching' || step === 'drivers' ? (
        <TripMapPicker
          className="absolute inset-0 z-0 min-h-[calc(100svh-env(safe-area-inset-bottom,0px))]"
          pickup={pickup}
          dropoff={dropoff}
          mapMode={mapMode}
          onPickupChange={setPickup}
          onDropoffChange={setDropoff}
          recenterTick={mapRecenterTick}
          readOnly={step === 'matching' || step === 'drivers'}
          searchRadiusKm={step === 'matching' || step === 'drivers' ? searchRadiusKm : null}
          nearbyDrivers={
            step === 'plan'
              ? mapPreviewDrivers
              : step === 'matching' || step === 'drivers'
                ? offeredDrivers
                : []
          }
        />
      ) : (
        <MapBg src={mapSrc} />
      )}
      {step === 'drivers' ? <div className="pointer-events-none absolute inset-0 z-[1] bg-black/25" aria-hidden /> : null}
      {step !== 'plan' && step !== 'drivers' ? <FloatingRouteCard pickup={pickup} dropoff={dropoff} /> : null}
      {step === 'offers' ? <PinCluster /> : null}
      {step === 'matching' || (step === 'offers' && actionLoading) ? (
        <>
          <SearchRadarPulse label={`جاري البحث عن سائقين قريبين · ضمن ${searchRadiusKm} كم`} />
          <SpinnerOnMap label="جاري البحث…" sub={`يتم توسيع نطاق البحث تدريجيًا · ${searchRadiusKm} كم`} />
          {radiusHint ? (
            <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--safe-top)+5.1rem)] z-[7] flex justify-center px-3">
              <div className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-primary shadow-md ring-1 ring-black/5 backdrop-blur-sm">
                {radiusHint}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

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
          tripDistanceKm={tripDistanceKm}
          onUseMyLocation={applyDeviceLocation}
          locationBusy={locationBusy}
          onPickupPatch={(patch) => setPickup((p) => ({ ...p, ...patch }))}
          onDropoffPatch={(patch) => setDropoff((d) => ({ ...d, ...patch }))}
          onRequestMapRecenter={bumpMapRecenter}
        />
      ) : null}
      {step === 'offers' ? (
        <OffersSheet
          vehicles={vehicleTypes}
          selectedIdx={selectedVehicleIdx}
          onSelectIdx={setSelectedVehicleIdx}
          fare={fare}
          distanceKm={tripDistanceKm}
          fallbackPerKm={fallbackPerKm}
          onSearchDrivers={searchDrivers}
          onBack={goPlan}
          loading={actionLoading}
        />
      ) : null}
      {step === 'matching' ? (
        <MatchingSheet
          driverCount={offeredDrivers.length}
          driverPreview={offeredDrivers.slice(0, 8)}
          bookingMeta={bookingOfferMeta}
          onPickDrivers={goDrivers}
          onCancelRequest={() => setCancelOpen(true)}
          estimatedFare={fare}
          distanceKm={tripDistanceKm}
        />
      ) : null}
      {step === 'drivers' ? (
        <SelectDriverSheet
          drivers={offeredDrivers}
          tripFareEstimate={fare}
          distanceKm={tripDistanceKm}
          bookingMeta={bookingOfferMeta}
          onBackToMatching={() => {
            setStep('matching')
            refreshNearDrivers()
          }}
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
