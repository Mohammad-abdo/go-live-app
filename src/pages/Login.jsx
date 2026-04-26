import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { extractToken } from '@/config/endpointSuite'
import { setSessionAuth, hasAnySessionToken } from '@/lib/sessionTokens'
import { loadTesterSettings, saveTesterSettings } from '@/lib/testerSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import AuthScreenShell from '@/components/auth/AuthScreenShell'
import { GoLogoMark } from '@/components/branding/GoLogoMark'

function normalizePhone(p) {
  return String(p ?? '')
    .trim()
    .replace(/\s+/g, '')
}

export default function Login() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('rider')
  const [phone, setPhone] = useState(() => loadTesterSettings().riderPhone)
  const [password, setPassword] = useState(() => loadTesterSettings().riderPassword)
  const [driverPhone, setDriverPhone] = useState(() => loadTesterSettings().driverPhone)
  const [driverPassword, setDriverPassword] = useState(() => loadTesterSettings().driverPassword)
  const [loading, setLoading] = useState(false)

  if (hasAnySessionToken()) {
    return <Navigate to="/app/home" replace />
  }

  const submitRider = async (e) => {
    e.preventDefault()
    const p = normalizePhone(phone)
    if (!p || !password) {
      toast.error('أدخل رقم الجوال وكلمة المرور')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/apimobile/user/auth/login', { phone: p, password })
      const token = extractToken(data)
      if (!token) throw new Error('لم يُرجع الخادم رمز الدخول')
      setSessionAuth({ riderToken: token, driverToken: '', activeRole: 'rider' })
      saveTesterSettings({ ...loadTesterSettings(), riderPhone: p, riderPassword: password })
      toast.success(data?.message || 'تم تسجيل الدخول')
      navigate('/app/home', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'فشل تسجيل الدخول'
      const st = err?.response?.status
      if (st === 403 && String(msg).toLowerCase().includes('verify')) {
        toast.message(msg)
        navigate('/verify-otp', { replace: false, state: { phone: p, needsResend: true } })
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const submitDriver = async (e) => {
    e.preventDefault()
    const p = normalizePhone(driverPhone)
    if (!p || !driverPassword) {
      toast.error('أدخل رقم الجوال وكلمة المرور')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/apimobile/driver/auth/login', {
        phone: p,
        password: driverPassword,
      })
      const token = extractToken(data)
      if (!token) throw new Error('لم يُرجع الخادم رمز الدخول')
      setSessionAuth({ driverToken: token, riderToken: '', activeRole: 'driver' })
      saveTesterSettings({
        ...loadTesterSettings(),
        driverPhone: p,
        driverPassword: driverPassword,
      })
      toast.success(data?.message || 'تم تسجيل الدخول')
      navigate('/app/home', { replace: true })
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'فشل تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthScreenShell
      bottomSlot={
        <p className="text-center text-xs text-[#8595AD]">
          <Link to="/" className="font-semibold text-primary hover:underline">
            شاشة البداية
          </Link>
          <span className="mx-1.5 text-[#D5D9E2]">|</span>
          <Link to="/onboarding" className="font-semibold text-primary hover:underline">
            عن التطبيق
          </Link>
        </p>
      }
    >
      <div className="mb-6 grid grid-cols-[2.5rem_1fr_2.5rem] items-start">
        <span className="size-10" aria-hidden />
        <div className="flex flex-col items-center text-center">
          <GoLogoMark className="mb-3 text-primary" />
          <h1 className="text-[1.45rem] font-black leading-tight text-[#0A0C0F]">مرحباً بك</h1>
          <p className="mt-2 max-w-[280px] text-[13px] font-medium leading-relaxed text-[#6B7788]">
            سجّل الدخول للمتابعة إلى الرحلات والخريطة
          </p>
        </div>
        <Link
          to="/"
          className="flex size-10 items-center justify-center rounded-full border border-[#E8EAEF] bg-white text-primary shadow-sm"
          aria-label="الرئيسية"
        >
          <Home className="size-5" strokeWidth={2.25} />
        </Link>
      </div>

      <div className="rounded-[24px] border border-[#E8EAEF] bg-white p-1.5 shadow-[0_12px_40px_rgba(10,12,15,0.08)]">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid h-[52px] w-full grid-cols-2 gap-1 rounded-[20px] bg-[#F1F2F6] p-1.5">
            <TabsTrigger
              value="rider"
              className={cn(
                'rounded-[16px] text-sm font-black transition-all',
                'data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md',
                'data-[state=inactive]:text-[#8595AD]',
              )}
            >
              راكب
            </TabsTrigger>
            <TabsTrigger
              value="driver"
              className={cn(
                'rounded-[16px] text-sm font-black transition-all',
                'data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md',
                'data-[state=inactive]:text-[#8595AD]',
              )}
            >
              كابتن
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rider" className="mt-0 space-y-4 px-4 pb-5 pt-5 focus-visible:outline-none">
            <form onSubmit={submitRider} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[12px] font-bold text-[#52627A]">
                  رقم الجوال
                </Label>
                <Input
                  id="phone"
                  className="h-[52px] rounded-2xl border-2 border-[#E8EAEF] bg-[#FAFAFA] text-end text-base font-medium shadow-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/12"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+20 أو 01xxxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw" className="text-[12px] font-bold text-[#52627A]">
                  كلمة المرور
                </Label>
                <Input
                  id="pw"
                  className="h-[52px] rounded-2xl border-2 border-[#E8EAEF] bg-[#FAFAFA] text-end text-base font-medium shadow-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/12"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>
              <Button
                type="submit"
                className="h-[52px] w-full rounded-2xl text-base font-black shadow-[0_10px_28px_rgba(92,45,142,0.35)]"
                disabled={loading}
              >
                {loading ? 'جاري الدخول…' : 'تسجيل الدخول'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="driver" className="mt-0 space-y-4 px-4 pb-5 pt-5 focus-visible:outline-none">
            <form onSubmit={submitDriver} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dphone" className="text-[12px] font-bold text-[#52627A]">
                  رقم الجوال
                </Label>
                <Input
                  id="dphone"
                  className="h-[52px] rounded-2xl border-2 border-[#E8EAEF] bg-[#FAFAFA] text-end text-base font-medium shadow-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/12"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+20 أو 01xxxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dpw" className="text-[12px] font-bold text-[#52627A]">
                  كلمة المرور
                </Label>
                <Input
                  id="dpw"
                  className="h-[52px] rounded-2xl border-2 border-[#E8EAEF] bg-[#FAFAFA] text-end text-base font-medium shadow-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/12"
                  type="password"
                  value={driverPassword}
                  onChange={(e) => setDriverPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>
              <Button
                type="submit"
                className="h-[52px] w-full rounded-2xl text-base font-black shadow-[0_10px_28px_rgba(92,45,142,0.35)]"
                disabled={loading}
              >
                {loading ? 'جاري الدخول…' : 'تسجيل الدخول ككابتن'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      <p className="mt-6 text-center text-sm font-medium text-[#52627A]">
        ليس لديك حساب؟{' '}
        <Link to="/signup" className="font-black text-primary underline-offset-2 hover:underline">
          راكب
        </Link>
        <span className="mx-1.5 text-[#D5D9E2]">·</span>
        <Link to="/signup-driver" className="font-black text-primary underline-offset-2 hover:underline">
          كابتن
        </Link>
      </p>
    </AuthScreenShell>
  )
}
