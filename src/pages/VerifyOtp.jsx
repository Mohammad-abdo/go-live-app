import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { extractToken } from '@/config/endpointSuite'
import { getSessionRiderToken, setSessionAuth } from '@/lib/sessionTokens'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronRight } from 'lucide-react'
import AuthScreenShell from '@/components/auth/AuthScreenShell'

export default function VerifyOtp() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state || {}
  const phone = typeof state.phone === 'string' ? state.phone : ''
  const needsResend = Boolean(state.needsResend)

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendBoot, setResendBoot] = useState(needsResend)

  useEffect(() => {
    if (!needsResend || !phone) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.post('/apimobile/user/auth/resend-otp', { phone })
        const token = extractToken(data)
        if (token) setSessionAuth({ riderToken: token, activeRole: 'rider' })
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

  if (needsResend && !phone) {
    return <Navigate to="/login" replace />
  }

  if (!needsResend && !getSessionRiderToken()) {
    return <Navigate to="/login" replace />
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/apimobile/user/auth/submit-otp', { otp })
      const token = extractToken(data)
      if (token) setSessionAuth({ riderToken: token, activeRole: 'rider' })
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
      <div className="mb-5 flex items-center gap-2">
        <Link
          to="/login"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#E8EAEF] bg-white text-primary shadow-sm"
          aria-label="رجوع"
        >
          <ChevronRight className="size-5 rtl:rotate-180" />
        </Link>
        <div className="min-w-0 flex-1 text-end">
          <h1 className="text-xl font-bold text-[#0A0C0F]">تأكيد الرقم</h1>
          {phone ? (
            <p className="mt-0.5 truncate text-xs text-[#8595AD]" dir="ltr">
              {phone}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-[22px] border border-[#E8EAEF] bg-white p-4 shadow-[0_8px_30px_rgba(10,12,15,0.06)]">
        <p className="mb-4 text-end text-sm leading-relaxed text-[#52627A]">
          أدخل الرمز المرسل من الخادم إلى جوالك.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otp" className="text-xs font-semibold text-[#52627A]">
              رمز التحقق
            </Label>
            <Input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="h-12 rounded-xl border-[#E8EAEF] bg-[#fafafa] text-center text-lg font-semibold tracking-[0.35em] focus-visible:ring-primary/30"
              dir="ltr"
              placeholder="••••••"
              autoComplete="one-time-code"
              inputMode="numeric"
            />
          </div>
          <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold shadow-sm" disabled={loading || resendBoot}>
            {resendBoot ? 'جاري الإرسال…' : loading ? 'جاري التحقق…' : 'تأكيد'}
          </Button>
        </form>
        {phone ? (
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full rounded-xl border-[#E8EAEF]"
            disabled={loading || resendBoot}
            onClick={async () => {
              setLoading(true)
              try {
                const { data } = await api.post('/apimobile/user/auth/resend-otp', { phone })
                const token = extractToken(data)
                if (token) setSessionAuth({ riderToken: token, activeRole: 'rider' })
                toast.success(data?.message || 'أُعيد إرسال الرمز')
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
