import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
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
    setLoading(true)
    try {
      const { data } = await api.post('/apimobile/user/auth/login', { phone, password })
      const token = extractToken(data)
      if (!token) throw new Error('لم يُرجع الخادم رمز الدخول')
      setSessionAuth({ riderToken: token, activeRole: 'rider' })
      saveTesterSettings({ ...loadTesterSettings(), riderPhone: phone, riderPassword: password })
      toast.success(data?.message || 'تم تسجيل الدخول')
      navigate('/app/home', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'فشل تسجيل الدخول'
      const st = err?.response?.status
      if (st === 403 && String(msg).toLowerCase().includes('verify')) {
        toast.message(msg)
        navigate('/verify-otp', { replace: false, state: { phone, needsResend: true } })
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const submitDriver = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/apimobile/driver/auth/login', {
        phone: driverPhone,
        password: driverPassword,
      })
      const token = extractToken(data)
      if (!token) throw new Error('لم يُرجع الخادم رمز الدخول')
      setSessionAuth({ driverToken: token, activeRole: 'driver' })
      saveTesterSettings({
        ...loadTesterSettings(),
        driverPhone,
        driverPassword,
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
          <Link to="/" className="font-medium text-primary hover:underline">
            شاشة البداية
          </Link>
        </p>
      }
    >
      <div className="mb-6 text-center">
        <img src="/go-splash-logo.png" alt="" className="mx-auto h-14 w-auto object-contain opacity-95" width={112} height={56} />
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-[#0A0C0F]">مرحباً بك</h1>
        <p className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-[#52627A]">سجّل الدخول للمتابعة</p>
      </div>

      <div className="rounded-[22px] border border-[#E8EAEF] bg-white p-1 shadow-[0_8px_30px_rgba(10,12,15,0.06)]">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid h-12 w-full grid-cols-2 gap-1 rounded-[18px] bg-[#F0F2F5] p-1">
            <TabsTrigger
              value="rider"
              className={cn(
                'rounded-[14px] text-sm font-semibold transition-all',
                'data-[state=active]:bg-white data-[state=active]:text-[#0A0C0F] data-[state=active]:shadow-sm',
                'data-[state=inactive]:text-[#8595AD]',
              )}
            >
              راكب
            </TabsTrigger>
            <TabsTrigger
              value="driver"
              className={cn(
                'rounded-[14px] text-sm font-semibold transition-all',
                'data-[state=active]:bg-white data-[state=active]:text-[#0A0C0F] data-[state=active]:shadow-sm',
                'data-[state=inactive]:text-[#8595AD]',
              )}
            >
              كابتن
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rider" className="mt-0 space-y-4 px-4 pb-4 pt-4 focus-visible:outline-none">
            <form onSubmit={submitRider} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-[#52627A]">
                  رقم الجوال
                </Label>
                <Input
                  id="phone"
                  className="h-12 rounded-xl border-[#E8EAEF] bg-[#fafafa] text-end text-base shadow-none focus-visible:ring-primary/30"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw" className="text-xs font-semibold text-[#52627A]">
                  كلمة المرور
                </Label>
                <Input
                  id="pw"
                  className="h-12 rounded-xl border-[#E8EAEF] bg-[#fafafa] text-end text-base shadow-none focus-visible:ring-primary/30"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold shadow-sm" disabled={loading}>
                {loading ? 'جاري الدخول…' : 'تسجيل الدخول'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="driver" className="mt-0 space-y-4 px-4 pb-4 pt-4 focus-visible:outline-none">
            <form onSubmit={submitDriver} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="dphone" className="text-xs font-semibold text-[#52627A]">
                  رقم الجوال
                </Label>
                <Input
                  id="dphone"
                  className="h-12 rounded-xl border-[#E8EAEF] bg-[#fafafa] text-end text-base shadow-none focus-visible:ring-primary/30"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dpw" className="text-xs font-semibold text-[#52627A]">
                  كلمة المرور
                </Label>
                <Input
                  id="dpw"
                  className="h-12 rounded-xl border-[#E8EAEF] bg-[#fafafa] text-end text-base shadow-none focus-visible:ring-primary/30"
                  type="password"
                  value={driverPassword}
                  onChange={(e) => setDriverPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold shadow-sm" disabled={loading}>
                {loading ? 'جاري الدخول…' : 'تسجيل الدخول ككابتن'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      <p className="mt-5 text-center text-sm text-[#52627A]">
        ليس لديك حساب؟{' '}
        <Link to="/signup" className="font-semibold text-primary hover:underline">
          إنشاء حساب راكب
        </Link>
      </p>
    </AuthScreenShell>
  )
}
