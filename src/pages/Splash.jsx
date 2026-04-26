import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { hasAnySessionToken } from '@/lib/sessionTokens'

/** Figma `12:12015` — Splash: إطار فاتح، شعار GO، أزرار أسفل (بدون شريط حالة وهمي). */
export default function Splash() {
  const signedIn = hasAnySessionToken()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#0A0C0F] px-4 py-8">
      <div
        className="relative flex w-full max-w-[390px] flex-col overflow-hidden rounded-[30px] bg-[#fbfbfb] shadow-2xl ring-1 ring-black/5"
        style={{ minHeight: 'min(844px, 100svh)' }}
        data-node-id="12:12015"
      >
        <div
          className="flex flex-1 flex-col items-center justify-center px-8 pb-12 pt-[max(2rem,var(--safe-top))]"
        >
          <img
            src="/go-splash-logo.png"
            alt="Go"
            className="mx-auto w-full max-w-[300px] object-contain"
            width={300}
            height={145}
          />
        </div>
        <div className="space-y-3 px-6 pb-10">
          {signedIn ? (
            <Button asChild className="h-12 w-full rounded-xl text-base font-semibold">
              <Link to="/app/home">متابعة إلى الخريطة</Link>
            </Button>
          ) : (
            <>
              <Button asChild className="h-12 w-full rounded-xl text-base font-semibold">
                <Link to="/onboarding">ابدأ</Link>
              </Button>
              <Button asChild variant="outline" className="h-12 w-full rounded-xl border-[#E0E4EB] text-base font-semibold text-[#0A0C0F]">
                <Link to="/login">تسجيل الدخول</Link>
              </Button>
            </>
          )}
        </div>
        <div className="flex h-9 shrink-0 items-center justify-center pb-3">
          <div className="h-1 w-28 rounded-full bg-[#0A0C0F]/12" />
        </div>
      </div>
    </div>
  )
}
