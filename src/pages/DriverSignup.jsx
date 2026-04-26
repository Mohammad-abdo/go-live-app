import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { extractToken } from '@/config/endpointSuite'
import { hasAnySessionToken, setSessionAuth } from '@/lib/sessionTokens'
import { loadTesterSettings } from '@/lib/testerSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuthScreenShell from '@/components/auth/AuthScreenShell'

/**
 * تسجيل سائق — `POST /apimobile/driver/auth/register` (multipart، نفس Swagger).
 * بعد النجاح قد يبقى الحساب pending حتى موافقة الإدارة؛ يُعاد JWT للسائق.
 */
export default function DriverSignup() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState(() => loadTesterSettings().driverPhone || '')
  const [countryCode, setCountryCode] = useState('+20')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carColor, setCarColor] = useState('')
  const [carPlate, setCarPlate] = useState('')
  const [carYear, setCarYear] = useState('')
  const [loading, setLoading] = useState(false)

  if (hasAnySessionToken()) {
    return <Navigate to="/app/home" replace />
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!firstName.trim() || !phone.trim() || !password) {
      toast.error('الاسم الأول ورقم الجوال وكلمة المرور مطلوبة')
      return
    }
    if (password !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('firstName', firstName.trim())
      if (lastName.trim()) fd.append('lastName', lastName.trim())
      if (email.trim()) fd.append('email', email.trim().toLowerCase())
      fd.append('contactNumber', phone.trim().replace(/\s+/g, ''))
      fd.append('countryCode', countryCode.trim() || '+20')
      fd.append('password', password)
      fd.append('confirmPassword', confirmPassword)
      if (carModel.trim()) fd.append('carModel', carModel.trim())
      if (carColor.trim()) fd.append('carColor', carColor.trim())
      if (carPlate.trim()) fd.append('carPlateNumber', carPlate.trim())
      if (carYear.trim() && /^\d{4}$/.test(carYear.trim())) {
        fd.append('carProductionYear', carYear.trim())
      }

      const { data } = await api.post('/apimobile/driver/auth/register', fd)
      const token = extractToken(data)
      if (token) {
        setSessionAuth({ driverToken: token, riderToken: '', activeRole: 'driver' })
      }
      toast.success(data?.message || 'تم إرسال طلب التسجيل كسائق')
      navigate('/app/home', { replace: true })
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
          <h1 className="text-xl font-bold text-[#0A0C0F]">تسجيل كابتن</h1>
          <p className="text-xs text-[#8595AD]">POST /apimobile/driver/auth/register</p>
        </div>
      </div>

      <div className="mb-4 rounded-[16px] border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-end">
        <p className="text-xs leading-relaxed text-amber-950">
          قد يحتاج الحساب إلى موافقة الإدارة قبل العمل. يمكنك رفع المستندات لاحقاً من لوحة التحكم أو Swagger إن لزم.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-3.5 rounded-[22px] border border-[#E8EAEF] bg-white p-4 shadow-[0_8px_30px_rgba(10,12,15,0.06)]"
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#52627A]">الاسم الأول *</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-11 rounded-xl text-end"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#52627A]">اسم العائلة</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-11 rounded-xl text-end" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#52627A]">البريد (اختياري)</Label>
          <Input
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl text-start"
          />
        </div>
        <div className="grid grid-cols-[5.5rem_1fr] gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#52627A]">الرمز</Label>
            <Input
              dir="ltr"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="h-11 rounded-xl text-center font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#52627A]">جوال *</Label>
            <Input
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 rounded-xl text-start"
              required
              inputMode="tel"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#52627A]">كلمة المرور *</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl text-end"
            required
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#52627A]">تأكيد كلمة المرور *</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11 rounded-xl text-end"
            required
            autoComplete="new-password"
          />
        </div>
        <p className="text-end text-[11px] font-bold text-primary">المركبة (مستحسن)</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#52627A]">الموديل</Label>
            <Input value={carModel} onChange={(e) => setCarModel(e.target.value)} className="h-11 rounded-xl text-end" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#52627A]">اللون</Label>
            <Input value={carColor} onChange={(e) => setCarColor(e.target.value)} className="h-11 rounded-xl text-end" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#52627A]">لوحة الأرقام</Label>
            <Input
              dir="ltr"
              value={carPlate}
              onChange={(e) => setCarPlate(e.target.value)}
              className="h-11 rounded-xl font-mono text-start"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#52627A]">سنة الصنع</Label>
            <Input
              dir="ltr"
              placeholder="2020"
              value={carYear}
              onChange={(e) => setCarYear(e.target.value)}
              className="h-11 rounded-xl text-start"
              maxLength={4}
            />
          </div>
        </div>
        <Button type="submit" className="mt-2 h-12 w-full rounded-xl text-base font-semibold" disabled={loading}>
          {loading ? 'جاري التسجيل…' : 'إرسال طلب التسجيل'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-[#52627A]">
        لديك حساب كابتن؟{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          تسجيل الدخول
        </Link>
        <span className="mx-2 text-[#D5D9E2]">|</span>
        <Link to="/signup" className="font-semibold text-primary hover:underline">
          تسجيل راكب
        </Link>
      </p>
    </AuthScreenShell>
  )
}
