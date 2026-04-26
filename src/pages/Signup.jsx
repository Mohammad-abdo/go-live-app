import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { extractToken } from '@/config/endpointSuite'
import { hasAnySessionToken, setSessionAuth } from '@/lib/sessionTokens'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronRight } from 'lucide-react'
import AuthScreenShell from '@/components/auth/AuthScreenShell'

/**
 * تسجيل راكب — `POST /apimobile/user/auth/register` ثم `/verify-otp`.
 */
export default function Signup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (hasAnySessionToken()) {
    return <Navigate to="/app/home" replace />
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/apimobile/user/auth/register', {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
        password,
        confirmPassword,
      })
      const token = extractToken(data)
      if (token) setSessionAuth({ riderToken: token, driverToken: '', activeRole: 'rider' })
      toast.success(data?.message || 'تم إنشاء الحساب')
      navigate('/verify-otp', { replace: true, state: { phone: phone.trim() } })
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'فشل التسجيل')
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
          <h1 className="text-xl font-bold text-[#0A0C0F]">إنشاء حساب</h1>
          <p className="text-xs text-[#8595AD]">راكب جديد</p>
        </div>
      </div>

      <div className="mb-4 rounded-[16px] border border-primary/15 bg-primary/[0.06] px-3 py-2.5 text-end">
        <p className="text-xs leading-relaxed text-[#52627A]">
          بعد الإرسال سيُطلب منك رمز التحقق الذي يُرسله الخادم إلى جوالك.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3.5 rounded-[22px] border border-[#E8EAEF] bg-white p-4 shadow-[0_8px_30px_rgba(10,12,15,0.06)]">
        <div className="space-y-1.5">
          <Label htmlFor="su-name" className="text-xs font-semibold text-[#52627A]">
            الاسم الكامل
          </Label>
          <Input
            id="su-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl border-[#E8EAEF] bg-[#fafafa] text-end text-base focus-visible:ring-primary/30"
            required
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="su-email" className="text-xs font-semibold text-[#52627A]">
            البريد الإلكتروني <span className="font-normal text-[#8595AD]">(اختياري)</span>
          </Label>
          <Input
            id="su-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border-[#E8EAEF] bg-[#fafafa] text-end focus-visible:ring-primary/30"
            dir="ltr"
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="su-phone" className="text-xs font-semibold text-[#52627A]">
            رقم الجوال
          </Label>
          <Input
            id="su-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
            className="h-12 rounded-xl border-[#E8EAEF] bg-[#fafafa] text-end focus-visible:ring-primary/30"
            dir="ltr"
            required
            autoComplete="tel"
            inputMode="tel"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="su-pw" className="text-xs font-semibold text-[#52627A]">
            كلمة المرور
          </Label>
          <Input
            id="su-pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border-[#E8EAEF] bg-[#fafafa] text-end focus-visible:ring-primary/30"
            required
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="su-pw2" className="text-xs font-semibold text-[#52627A]">
            تأكيد كلمة المرور
          </Label>
          <Input
            id="su-pw2"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 rounded-xl border-[#E8EAEF] bg-[#fafafa] text-end focus-visible:ring-primary/30"
            required
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" className="mt-1 h-12 w-full rounded-xl text-base font-semibold shadow-sm" disabled={loading}>
          {loading ? 'جاري الإنشاء…' : 'إنشاء الحساب ومتابعة'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-[#52627A]">
        لديك حساب؟{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </AuthScreenShell>
  )
}
