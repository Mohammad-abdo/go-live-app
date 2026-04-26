import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FIGMA_ASSETS } from '@/lib/figmaAssets'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SLIDE_IMAGES = [FIGMA_ASSETS.onboardingSlide1, FIGMA_ASSETS.onboardingSlide2, FIGMA_ASSETS.onboardingSlide3]

/** Copy aligned with Figma `12:12541` / onboarding sequence (Arabic, RTL). */
const SLIDES = [
  {
    title: 'حدِّد سعرك بنفسك',
    body: 'اقترح السعر اللي يناسب، واستقبل عروض من كباتن قريبين. اختار العرض الأنسب حسب السعر، التقييم، ووقت الوصول.',
    image: SLIDE_IMAGES[0],
  },
  {
    title: 'رحلات آمنة',
    body: 'تابع رحلتك لحظة بلحظة، وتواصل مع الكابتن بسهولة قبل وأثناء الرحلة.',
    image: SLIDE_IMAGES[1],
  },
  {
    title: 'جاهز للانطلاق؟',
    body: 'سجّل الدخول للوصول إلى الخريطة والعروض والسلامة كما في تصميم Go Back.',
    image: SLIDE_IMAGES[2],
  },
]

export default function Onboarding() {
  const [i, setI] = useState(0)
  const [imgBad, setImgBad] = useState(() => SLIDES.map(() => false))
  const navigate = useNavigate()
  const slide = SLIDES[i]

  const setSlideBad = (idx, bad) => {
    setImgBad((prev) => {
      const next = [...prev]
      next[idx] = bad
      return next
    })
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#0A0C0F] px-3 py-6">
      <div
        className="relative flex w-full max-w-[390px] flex-col overflow-hidden rounded-[30px] bg-[#fafafa] shadow-2xl ring-1 ring-black/5"
        style={{ minHeight: 'min(844px, 100svh)' }}
        dir="rtl"
        data-node-id="12:12541"
      >
        <div className="pointer-events-none absolute left-0 top-0 h-[min(52%,431px)] w-full bg-gradient-to-b from-primary via-primary to-primary/5" />
        <div className="pointer-events-none absolute left-0 top-0 h-[min(52%,431px)] w-full opacity-30 mix-blend-soft-light" aria-hidden />

        <button
          type="button"
          className="absolute end-5 top-[max(0.75rem,var(--safe-top))] z-10 text-sm font-medium text-white/95"
          onClick={() => navigate('/login')}
        >
          تخطي
        </button>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative flex min-h-[200px] flex-1 flex-col items-center justify-end px-5 pb-2 pt-4">
            {!imgBad[i] ? (
              <img
                src={slide.image}
                alt=""
                className="relative z-[1] max-h-[260px] w-full max-w-[390px] object-contain object-bottom"
                onError={() => setSlideBad(i, true)}
              />
            ) : (
              <div className="relative z-[1] flex max-h-[220px] w-full max-w-[280px] flex-1 items-center justify-center">
                <img src="/go-splash-logo.png" alt="" className="h-24 w-auto object-contain opacity-95 drop-shadow-lg" />
              </div>
            )}
          </div>

          <div className="relative z-[2] flex flex-col rounded-t-[24px] bg-white px-5 pb-6 pt-6 shadow-[0_-12px_40px_rgba(0,0,0,0.06)]">
            <h2 className="text-center text-xl font-bold leading-snug text-ink">{slide.title}</h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-[#52627A]">{slide.body}</p>
            <div className="mx-auto mt-5 flex h-2 items-center justify-center gap-2">
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`شريحة ${idx + 1}`}
                  className={cn('h-2 rounded-full transition-all', idx === i ? 'w-6 bg-primary' : 'w-2 bg-[#E0E4EB]')}
                  onClick={() => setI(idx)}
                />
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              {i > 0 ? (
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setI((n) => n - 1)}>
                  السابق
                </Button>
              ) : (
                <span className="flex-1" />
              )}
              {i < SLIDES.length - 1 ? (
                <Button type="button" className="flex-1 rounded-xl" onClick={() => setI((n) => n + 1)}>
                  التالي
                </Button>
              ) : (
                <Button type="button" className="flex-1 rounded-xl" onClick={() => navigate('/login')}>
                  تسجيل الدخول
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex h-9 shrink-0 items-center justify-center bg-white pb-2">
          <div className="h-1 w-28 rounded-full bg-[#1b294b]" />
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-white/60">
        <Link to="/" className="underline">
          شاشة البداية
        </Link>
      </p>
    </div>
  )
}
