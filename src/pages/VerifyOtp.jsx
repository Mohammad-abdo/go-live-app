import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { extractToken } from '@/config/endpointSuite'
import { getSessionRiderToken, setSessionAuth } from '@/lib/sessionTokens'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import AuthScreenShell from '@/components/auth/AuthScreenShell'
import { GoLogoMark } from '@/components/branding/GoLogoMark'

/** الخادم يرسل OTP من 6 أرقام — واجهة مثل التصميم (خانات منفصلة). */
const N = 6

export default function VerifyOtp() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state || {}
  const phone = typeof state.phone === 'string' ? state.phone : ''
  const needsResend = Boolean(state.needsResend)

  const [digits, setDigits] = useState(() => Array(N).fill(''))
  const [loading, setLoading] = useState(false)
  const [resendBoot, setResendBoot] = useState(needsResend)
  const [resendSec, setResendSec] = useState(30)
  const inputsRef = useRef([])

  const otp = useMemo(() => digits.join(''), [digits])

  useEffect(() => {
    if (!needsResend || !phone) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.post('/apimobile/user/auth/resend-otp', { phone })
        const token = extractToken(data)
        if (token) setSessionAuth({ riderToken: token, driverToken: '', activeRole: 'rider' })
        if (!cancelled) toast.success(data?.message || 'تم إرسال رمز التحقق')
      } catch (e) {
        if (!cancelled) toast.error(e?.response?.data?.message || e.message)
      } finally {
        if (!cancelled) setResendBoot(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [needsResend, phone])

  useEffect(() => {
    if (resendBoot || resendSec <= 0) return
    const t = setInterval(() => setResendSec((s) => (s <= 1 ? 0 : s - 1)), 1000)
    return () => clearInterval(t)
  }, [resendBoot, resendSec])

  if (needsResend && !phone) {
    return <Navigate to="/login" replace />
  }

  if (!needsResend && !getSessionRiderToken()) {
    return <Navigate to="/login" replace />
  }

  const setAt = (i, ch) => {
    const c = ch.replace(/\D/g, '').slice(-1) || ''
    setDigits((prev) => {
      const next = [...prev]
      next[i] = c
      return next
    })
    if (c && i < N - 1) inputsRef.current[i + 1]?.focus()
  }

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
  }

  const onPaste = (e) => {
    const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, N)
    if (!t) return
    e.preventDefault()
    const next = Array(N)
      .fill('')
      .map((_, j) => t[j] || '')
    setDigits(next)
    const last = Math.min(t.length, N) - 1
    inputsRef.current[last]?.focus()
  }

  const submit = async (e) => {
    e.preventDefault()
    if (otp.length < N) {
      toast.error('أدخل الرمز كاملاً')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/apimobile/user/auth/submit-otp', { otp })
      const token = extractToken(data)
      if (token) setSessionAuth({ riderToken: token, driverToken: '', activeRole: 'rider' })
      toast.success(data?.message || 'تم تفعيل الحساب')
      navigate('/app/home', { replace: true })
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'رمز غير صحيح')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthScreenShell>
      <div className="mb-6 grid grid-cols-[2.5rem_1fr_2.5rem] items-start gap-2">
        <Link
          to="/login"
          className="flex size-10 items-center justify-center rounded-full border border-[#E8EAEF] bg-white text-primary shadow-sm"
          aria-label="رجوع"
        >
          <ChevronRight className="size-5 rtl:rotate-180" />
        </Link>
        <div className="min-w-0 text-center">
          <div className="mb-2 flex justify-center">
            <GoLogoMark className="text-primary" />
          </div>
          <h1 className="text-[1.35rem] font-black leading-snug text-[#0A0C0F]">أدخل رمز المصادقة</h1>
          {phone ? (
            <p className="mt-2 text-base font-bold text-[#0A0C0F]" dir="ltr">
              {phone}
            </p>
          ) : null}
        </div>
        <span className="size-10" aria-hidden />
      </div>

      <div className="rounded-[24px] border border-[#E8EAEF] bg-white p-5 shadow-[0_12px_40px_rgba(10,12,15,0.07)]">
        <p className="mb-5 text-center text-[13px] leading-relaxed text-[#8595AD]">
          أدخل الرقم المكوّن من {N} أرقام الذي أرسلناه عبر رقم الهاتف.
        </p>
        <form onSubmit={submit} className="space-y-6">
          <div className="flex flex-wrap justify-center gap-1.5" dir="ltr" onPaste={onPaste}>
            {Array.from({ length: N }).map((_, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el
                }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={digits[i]}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className="h-14 w-11 rounded-xl border-2 border-[#E8EAEF] bg-[#FAFAFA] text-center text-[22px] font-black text-[#0A0C0F] outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 sm:h-[3.75rem] sm:w-12"
                aria-label={`رقم ${i + 1}`}
              />
            ))}
          </div>
          <p className="text-center text-[12px] leading-relaxed text-[#8595AD]">
            {resendSec > 0 ? (
              <>
                لم تستلم الرمز؟ أعد إرساله خلال <span className="font-mono font-bold tabular-nums text-[#52627A]">{resendSec}</span> ثانية
              </>
            ) : (
              'يمكنك إعادة إرسال الرمز الآن'
            )}
          </p>
          <Button
            type="submit"
            className="h-[52px] w-full rounded-2xl text-lg font-black shadow-[0_8px_24px_rgba(92,45,142,0.28)]"
            disabled={loading || resendBoot}
          >
            {resendBoot ? 'جاري الإرسال…' : loading ? 'جاري التحقق…' : 'التالي'}
          </Button>
        </form>
        {phone ? (
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full rounded-xl border-[#E8EAEF]"
            disabled={loading || resendBoot || resendSec > 0}
            onClick={async () => {
              setLoading(true)
              try {
                const { data } = await api.post('/apimobile/user/auth/resend-otp', { phone })
                const token = extractToken(data)
                if (token) setSessionAuth({ riderToken: token, driverToken: '', activeRole: 'rider' })
                toast.success(data?.message || 'أُعيد إرسال الرمز')
                setResendSec(30)
              } catch (e) {
                toast.error(e?.response?.data?.message || e.message)
              } finally {
                setLoading(false)
              }
            }}
          >
            إعادة إرسال الرمز
          </Button>
        ) : null}
      </div>
    </AuthScreenShell>
  )
}
