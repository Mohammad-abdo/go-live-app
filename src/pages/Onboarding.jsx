import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { FIGMA_ASSETS } from '@/lib/figmaAssets'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Copy + art from Figma Go-Back: `12:12541`, `13:12770`, `13:12923`.
 * UX: primary CTA always visible; header matches Figma (تخطي + quick next); dots tappable.
 */
const SLIDES = [
  {
    title: 'حدِّد سعرك بنفسك',
    body: 'اقترح السعر اللي يناسب، واستقبل عروض من كباتن قريبين. اختار العرض الأنسب حسب السعر، التقييم، ووقت الوصول.',
    image: FIGMA_ASSETS.onboardingSlide1,
    pattern: FIGMA_ASSETS.onboardingPattern1,
  },
  {
    title: 'قارن العروض في ثواني',
    body: 'شوف عروض الأسعار من الكباتن لحظيًا، ورتّبهم بـ الأرخص / الأسرع / الأعلى تقييمًا عشان تختار بسرعة وبثقة.',
    image: FIGMA_ASSETS.onboardingSlide2,
    pattern: FIGMA_ASSETS.onboardingPattern2,
  },
  {
    title: 'تتبّع مباشر وتواصل سريع',
    body: 'تابع الكابتن على الخريطة، وابعث رسالة أو اتصل من داخل التطبيق. كمان تقدر تشارك الرحلة مع حد لزيادة الأمان.',
    image: FIGMA_ASSETS.onboardingSlide3,
    pattern: FIGMA_ASSETS.onboardingPattern3,
  },
]

export default function Onboarding() {
  const [i, setI] = useState(0)
  const [imgBad, setImgBad] = useState(() => SLIDES.map(() => false))
  const [patBad, setPatBad] = useState(() => SLIDES.map(() => false))
  const navigate = useNavigate()
  const slide = SLIDES[i]
  const isLast = i >= SLIDES.length - 1

  const setSlideBad = (idx, bad) => {
    setImgBad((prev) => {
      const next = [...prev]
      next[idx] = bad
      return next
    })
  }

  const setPatternBad = (idx, bad) => {
    setPatBad((prev) => {
      const next = [...prev]
      next[idx] = bad
      return next
    })
  }

  const goNext = useCallback(() => {
    if (isLast) navigate('/login')
    else setI((n) => Math.min(SLIDES.length - 1, n + 1))
  }, [isLast, navigate])

  const goSkip = useCallback(() => navigate('/login'), [navigate])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#0A0C0F] px-3 py-5">
      <div
        className="relative flex w-full max-w-[390px] flex-col overflow-hidden rounded-[30px] bg-[#fafafa] shadow-2xl ring-1 ring-black/5"
        style={{ minHeight: 'min(844px, 100svh)' }}
        dir="rtl"
        data-node-id="12:12541"
      >
        {!patBad[i] && slide.pattern ? (
          <img
            alt=""
            className="pointer-events-none absolute start-0 top-0 z-0 h-[min(48vh,431px)] w-full min-w-[100%] object-cover object-start opacity-[0.97]"
            src={slide.pattern}
            onError={() => setPatternBad(i, true)}
          />
        ) : (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[min(48vh,431px)] bg-gradient-to-bl from-primary via-primary to-primary/20"
            aria-hidden
          />
        )}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[min(48vh,431px)] bg-gradient-to-b from-primary/25 to-transparent mix-blend-soft-light"
          aria-hidden
        />

        <div className="relative z-10 flex items-center justify-between px-5 pt-[max(0.75rem,var(--safe-top))]">
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-xl px-2 text-sm font-semibold text-[#3D495C] transition-colors hover:bg-black/[0.04] hover:text-[#0A0C0F]"
            onClick={goSkip}
          >
            تخطي
          </button>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-xl bg-[#F0F2F5] text-[#3D495C] shadow-sm ring-1 ring-black/[0.04] transition-transform active:scale-95"
            onClick={goNext}
            aria-label={isLast ? 'تسجيل الدخول' : 'الشاشة التالية'}
          >
            <ChevronRight className="size-[18px] rtl:rotate-180" aria-hidden />
          </button>
        </div>

        <div className="relative z-[2] flex min-h-0 flex-1 flex-col px-4 pb-1 pt-2">
          <div className="flex min-h-[180px] flex-1 flex-col items-center justify-end pb-2">
            {!imgBad[i] ? (
              <img
                src={slide.image}
                alt=""
                className="relative z-[1] max-h-[min(42vh,280px)] w-full max-w-[320px] object-contain object-bottom drop-shadow-sm"
                onError={() => setSlideBad(i, true)}
              />
            ) : (
              <div className="relative z-[1] flex max-h-[220px] w-full max-w-[260px] flex-1 flex-col items-center justify-center gap-3">
                <img src="/go-splash-logo.png" alt="" className="h-20 w-auto object-contain opacity-90" />
                <p className="text-center text-xs text-[#8595AD]">تعذّر تحميل الصورة</p>
              </div>
            )}
          </div>

          <div className="rounded-t-[26px] bg-white px-5 pb-3 pt-5 shadow-[0_-10px_40px_rgba(10,12,15,0.07)]">
            <h2 className="text-center text-[20px] font-bold leading-snug text-[#0A0C0F]">{slide.title}</h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-[#52627A]">{slide.body}</p>

            <div className="mx-auto mt-5 flex h-2.5 items-center justify-center gap-2">
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`الشريحة ${idx + 1} من ${SLIDES.length}`}
                  aria-current={idx === i ? 'step' : undefined}
                  className={cn(
                    'h-2.5 rounded-full transition-all duration-300 ease-out',
                    idx === i ? 'w-8 bg-primary shadow-sm shadow-primary/25' : 'w-2 bg-[#E0E4EB] hover:bg-[#cfd6e3]',
                  )}
                  onClick={() => setI(idx)}
                />
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              {i > 0 ? (
                <Button type="button" variant="outline" className="h-12 shrink-0 rounded-xl px-4" onClick={() => setI((n) => n - 1)}>
                  السابق
                </Button>
              ) : null}
              <Button type="button" className="h-12 flex-1 rounded-xl text-base font-semibold" onClick={goNext}>
                {isLast ? 'تسجيل الدخول' : 'التالي'}
              </Button>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex h-9 shrink-0 items-center justify-center bg-white pb-2">
          <div className="h-1 w-28 rounded-full bg-[#1b294b]" />
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-white/55">
        <Link to="/" className="font-medium underline-offset-2 hover:text-white/90 hover:underline">
          شاشة البداية
        </Link>
      </p>
    </div>
  )
}
