import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FIGMA_ASSETS } from '@/lib/figmaAssets'
import { hasAnySessionToken } from '@/lib/sessionTokens'

/** Figma `12:12015` — Splash: فاتح، شعار GO، أزرار واضحة. */
export default function Splash() {
  const signedIn = hasAnySessionToken()
  const [logoLocalBad, setLogoLocalBad] = useState(false)

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#0A0C0F] px-4 py-8">
      <div
        className="relative flex w-full max-w-[390px] flex-col overflow-hidden rounded-[30px] bg-[#fbfbfb] shadow-2xl ring-1 ring-black/5"
        style={{ minHeight: 'min(844px, 100svh)' }}
        dir="rtl"
        data-node-id="12:12015"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/[0.07] to-transparent" aria-hidden />

        <div className="relative flex flex-1 flex-col items-center justify-center px-8 pb-8 pt-[max(2rem,var(--safe-top))]">
          {!logoLocalBad ? (
            <img
              src="/go-splash-logo.png"
              alt="Go"
              className="mx-auto w-full max-w-[300px] object-contain"
              width={300}
              height={145}
              onError={() => setLogoLocalBad(true)}
            />
          ) : (
            <img
              src={FIGMA_ASSETS.splashLogoGroup}
              alt="Go"
              className="mx-auto w-full max-w-[280px] object-contain"
              width={280}
              height={140}
            />
          )}
          <p className="mt-6 max-w-[280px] text-center text-sm leading-relaxed text-[#52627A]">
            رحلات آمنة بأسعار شفافة، وكباتن موثوقين بالقرب منك.
          </p>
        </div>

        <div className="space-y-3 px-6 pb-10">
          {signedIn ? (
            <Button asChild className="h-12 w-full rounded-xl text-base font-semibold shadow-sm">
              <Link to="/app/home">متابعة إلى الخريطة</Link>
            </Button>
          ) : (
            <>
              <Button asChild className="h-12 w-full rounded-xl text-base font-semibold shadow-sm">
                <Link to="/onboarding">ابدأ</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 w-full rounded-xl border-[#E0E4EB] bg-white text-base font-semibold text-[#0A0C0F] shadow-sm"
              >
                <Link to="/login">تسجيل الدخول</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex h-9 shrink-0 items-center justify-center bg-[#fbfbfb] pb-3">
          <div className="h-1 w-28 rounded-full bg-[#0A0C0F]/12" />
        </div>
      </div>
    </div>
  )
}
