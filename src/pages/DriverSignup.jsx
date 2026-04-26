import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Trash2, Upload } from 'lucide-react'
import { api } from '@/lib/api'
import { extractToken } from '@/config/endpointSuite'
import { hasAnySessionToken, setSessionAuth } from '@/lib/sessionTokens'
import { loadTesterSettings } from '@/lib/testerSettings'
import * as driver from '@/services/driverService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuthScreenShell from '@/components/auth/AuthScreenShell'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 0, title: 'بيانات الحساب', short: 'الحساب' },
  { id: 1, title: 'المركبة ونوع الخدمة', short: 'المركبة' },
  { id: 2, title: 'الصور والمستندات', short: 'الملفات' },
]

const MAX_DOCS = 10

function FilePickRow({ id, label, hint, accept, file, onClear, onChange, optional }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-[#52627A]">
        {label}
        {optional ? <span className="mr-1 font-normal text-[#8595AD]">(اختياري)</span> : null}
      </Label>
      {hint ? <p className="text-[11px] leading-relaxed text-[#8595AD]">{hint}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={id}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8EAEF] bg-[#fafafa] px-3 py-2.5 text-xs font-medium text-primary transition hover:bg-primary/5"
        >
          <Upload className="size-4 shrink-0" />
          {file ? file.name : 'اختر ملفاً'}
        </label>
        <input id={id} type="file" accept={accept} className="sr-only" onChange={onChange} />
        {file ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex size-9 items-center justify-center rounded-full border border-[#E8EAEF] text-[#52627A] hover:bg-red-50 hover:text-red-600"
            aria-label="إزالة الملف"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * تسجيل كابتن — خطوات: حساب → مركبة + خدمة + صورة السيارة → صورة شخصية + مستندات + بنك (اختياري).
 * `POST /apimobile/driver/auth/register` (multipart).
 */
export default function DriverSignup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState(() => loadTesterSettings().driverPhone || '')
  const [countryCode, setCountryCode] = useState('+20')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')

  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [serviceId, setServiceId] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carColor, setCarColor] = useState('')
  const [carPlate, setCarPlate] = useState('')
  const [carYear, setCarYear] = useState('')
  const [carImageFile, setCarImageFile] = useState(null)

  const [avatarFile, setAvatarFile] = useState(null)
  const [documentFiles, setDocumentFiles] = useState([])

  const [bankName, setBankName] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankIban, setBankIban] = useState('')
  const [bankSwift, setBankSwift] = useState('')

  const [loading, setLoading] = useState(false)

  const loadServices = useCallback(async () => {
    setServicesLoading(true)
    try {
      const list = await driver.getDriverRegistrationServices()
      setServices(Array.isArray(list) ? list : [])
    } catch {
      setServices([])
      toast.message('تعذر تحميل أنواع الخدمة — يمكنك المتابعة واختيارها لاحقاً من الدعم.')
    } finally {
      setServicesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (step === 1 && services.length === 0 && !servicesLoading) {
      loadServices()
    }
  }, [step, services.length, servicesLoading, loadServices])

  useEffect(() => {
    if (services.length && !serviceId) {
      setServiceId(String(services[0].id))
    }
  }, [services, serviceId])

  const step1Ok = useMemo(() => {
    if (!firstName.trim() || !phone.trim() || !password) return false
    if (password !== confirmPassword) return false
    return true
  }, [firstName, phone, password, confirmPassword])

  const step2Ok = useMemo(() => {
    if (!carModel.trim() || !carPlate.trim()) return false
    if (carYear.trim() && !/^\d{4}$/.test(carYear.trim())) return false
    return true
  }, [carModel, carPlate, carYear])

  const onDocumentsInput = (e) => {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    if (!picked.length) return
    setDocumentFiles((prev) => {
      const next = [...prev, ...picked].slice(0, MAX_DOCS)
      if (prev.length + picked.length > MAX_DOCS) {
        toast.message(`يُسمح بحد أقصى ${MAX_DOCS} ملفات للمستندات.`)
      }
      return next
    })
  }

  const removeDocAt = (idx) => {
    setDocumentFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const goNext = () => {
    if (step === 0) {
      if (!step1Ok) {
        if (password !== confirmPassword) toast.error('كلمتا المرور غير متطابقتين')
        else toast.error('الاسم الأول ورقم الجوال وكلمة المرور مطلوبة')
        return
      }
      setStep(1)
      return
    }
    if (step === 1) {
      if (!step2Ok) {
        toast.error('أدخل موديل المركبة ورقم اللوحة (سنة الصنع أربعة أرقام إن وُجدت).')
        return
      }
      setStep(2)
    }
  }

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!step1Ok) {
      toast.error('أكمل بيانات الحساب أولاً')
      setStep(0)
      return
    }
    if (!step2Ok) {
      toast.error('أكمل بيانات المركبة')
      setStep(1)
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
      if (gender === 'male' || gender === 'female') fd.append('gender', gender)
      if (address.trim()) fd.append('address', address.trim())

      if (serviceId) fd.append('serviceId', String(serviceId))
      fd.append('carModel', carModel.trim())
      if (carColor.trim()) fd.append('carColor', carColor.trim())
      fd.append('carPlateNumber', carPlate.trim())
      if (carYear.trim() && /^\d{4}$/.test(carYear.trim())) {
        fd.append('carProductionYear', carYear.trim())
      }
      if (carImageFile) fd.append('carImage', carImageFile)
      if (avatarFile) fd.append('avatar', avatarFile)
      for (const f of documentFiles) {
        fd.append('documents', f)
      }

      if (bankName.trim()) fd.append('bankName', bankName.trim())
      if (accountHolderName.trim()) fd.append('accountHolderName', accountHolderName.trim())
      if (accountNumber.trim()) fd.append('accountNumber', accountNumber.trim())
      if (bankIban.trim()) fd.append('bankIban', bankIban.trim())
      if (bankSwift.trim()) fd.append('bankSwift', bankSwift.trim())

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

  if (hasAnySessionToken()) {
    return <Navigate to="/app/home" replace />
  }

  return (
    <AuthScreenShell>
      <div className="mb-4 flex items-center gap-2">
        <Link
          to="/login"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#E8EAEF] bg-white text-primary shadow-sm"
          aria-label="رجوع"
        >
          <ChevronRight className="size-5 rtl:rotate-180" />
        </Link>
        <div className="min-w-0 flex-1 text-end">
          <h1 className="text-xl font-bold text-[#0A0C0F]">تسجيل كابتن</h1>
          <p className="text-xs text-[#8595AD]">الخطوة {step + 1} من {STEPS.length}</p>
        </div>
      </div>

      <div className="mb-4 flex justify-center gap-2" role="tablist" aria-label="تقدم التسجيل">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === step}
            onClick={() => {
              if (i < step) setStep(i)
            }}
            className={cn(
              'h-2 min-w-8 rounded-full transition',
              i === step ? 'bg-primary' : i < step ? 'bg-primary/35' : 'bg-[#E0E4EB]',
              i < step ? 'cursor-pointer' : i > step ? 'cursor-default' : '',
            )}
            title={s.title}
          />
        ))}
      </div>

      <div className="mb-3 rounded-[16px] border border-[#E8EAEF] bg-white/90 px-3 py-2 text-end">
        <p className="text-sm font-semibold text-[#0A0C0F]">{STEPS[step].title}</p>
      </div>

      <div className="mb-4 rounded-[16px] border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-end">
        <p className="text-xs leading-relaxed text-amber-950">
          قد يحتاج الحساب إلى موافقة الإدارة. رفع صورتك ورخصة القيادة وبطاقة الهوية وصورة المركبة يسرّع المراجعة.
        </p>
      </div>

      <form
        onSubmit={step === 2 ? submit : (e) => e.preventDefault()}
        className="space-y-3.5 rounded-[22px] border border-[#E8EAEF] bg-white p-4 shadow-[0_8px_30px_rgba(10,12,15,0.06)]"
      >
        {step === 0 ? (
          <>
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
              <Label className="text-xs font-semibold text-[#52627A]">النوع (اختياري)</Label>
              <div className="flex flex-wrap justify-end gap-2">
                {[
                  { v: '', l: 'بدون' },
                  { v: 'male', l: 'ذكر' },
                  { v: 'female', l: 'أنثى' },
                ].map((o) => (
                  <button
                    key={o.v || 'x'}
                    type="button"
                    onClick={() => setGender(o.v)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                      gender === o.v ? 'border-primary bg-primary/10 text-primary' : 'border-[#E8EAEF] bg-[#fafafa] text-[#52627A]',
                    )}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#52627A]">العنوان (اختياري)</Label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="flex w-full resize-none rounded-xl border border-[#E8EAEF] bg-[#fafafa] px-3 py-2 text-end text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                placeholder="المدينة، الحي…"
              />
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
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#52627A]">نوع الخدمة</Label>
              {servicesLoading ? (
                <p className="text-end text-xs text-[#8595AD]">جاري التحميل…</p>
              ) : services.length ? (
                <div className="max-h-40 space-y-2 overflow-y-auto overscroll-contain pe-0.5 text-end">
                  {services.map((svc) => {
                    const sid = String(svc.id)
                    const label = svc.nameAr || svc.name || `خدمة #${svc.id}`
                    return (
                      <label
                        key={svc.id}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm transition',
                          serviceId === sid ? 'border-primary bg-primary/5' : 'border-[#E8EAEF] bg-[#fafafa]',
                        )}
                      >
                        <input
                          type="radio"
                          name="serviceId"
                          className="size-4 accent-primary"
                          checked={serviceId === sid}
                          onChange={() => setServiceId(sid)}
                        />
                        <span className="min-w-0 flex-1 font-medium text-[#0A0C0F]">{label}</span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <p className="text-end text-xs text-[#8595AD]">لا توجد خدمات مفعّلة حالياً — يمكنك التسجيل وإكمال النوع لاحقاً.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#52627A]">موديل المركبة *</Label>
                <Input value={carModel} onChange={(e) => setCarModel(e.target.value)} className="h-11 rounded-xl text-end" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#52627A]">اللون</Label>
                <Input value={carColor} onChange={(e) => setCarColor(e.target.value)} className="h-11 rounded-xl text-end" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#52627A]">لوحة الأرقام *</Label>
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
            <FilePickRow
              id="car-image"
              label="صورة المركبة"
              hint="صورة واضحة للسيارة من الخارج (يفضّل مع ظهور اللوحة)."
              accept="image/*"
              file={carImageFile}
              onClear={() => setCarImageFile(null)}
              optional
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                setCarImageFile(f || null)
              }}
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <FilePickRow
              id="avatar"
              label="الصورة الشخصية"
              hint="صورة وجهك لحساب الكابتن."
              accept="image/*"
              file={avatarFile}
              onClear={() => setAvatarFile(null)}
              optional
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                setAvatarFile(f || null)
              }}
            />
            <div className="space-y-1.5">
              <Label htmlFor="docs-multi" className="text-xs font-semibold text-[#52627A]">
                المستندات (رخصة، هوية، تأمين…)
              </Label>
              <p className="text-[11px] leading-relaxed text-[#8595AD]">حتى {MAX_DOCS} ملفات — صور أو PDF.</p>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="docs-multi"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8EAEF] bg-[#fafafa] px-3 py-2.5 text-xs font-medium text-primary"
                >
                  <Upload className="size-4" />
                  إضافة ملفات
                </label>
                <input
                  id="docs-multi"
                  type="file"
                  multiple
                  accept="image/*,.pdf,application/pdf"
                  className="sr-only"
                  onChange={onDocumentsInput}
                />
              </div>
              {documentFiles.length ? (
                <ul className="mt-2 space-y-1.5 text-end text-xs text-[#0A0C0F]">
                  {documentFiles.map((f, idx) => (
                    <li key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2 rounded-lg bg-[#f4f5f8] px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => removeDocAt(idx)}
                        className="shrink-0 text-red-600 hover:underline"
                      >
                        حذف
                      </button>
                      <span className="min-w-0 truncate">{f.name}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <p className="text-end text-[11px] font-bold text-primary">بيانات بنكية (اختياري)</p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#52627A]">اسم البنك</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="h-11 rounded-xl text-end" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#52627A]">صاحب الحساب</Label>
                <Input
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="h-11 rounded-xl text-end"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#52627A]">رقم الحساب</Label>
                <Input
                  dir="ltr"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="h-11 rounded-xl text-start font-mono text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#52627A]">IBAN</Label>
                <Input
                  dir="ltr"
                  value={bankIban}
                  onChange={(e) => setBankIban(e.target.value)}
                  className="h-11 rounded-xl text-start font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#52627A]">SWIFT</Label>
                <Input
                  dir="ltr"
                  value={bankSwift}
                  onChange={(e) => setBankSwift(e.target.value)}
                  className="h-11 rounded-xl text-start font-mono text-sm"
                />
              </div>
            </div>
          </>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl border-[#E8EAEF]"
            onClick={goBack}
            disabled={step === 0 || loading}
          >
            <ChevronRight className="ms-1 size-4 rtl:rotate-180" />
            السابق
          </Button>
          {step < 2 ? (
            <Button type="button" className="h-12 rounded-xl font-semibold" onClick={goNext}>
              التالي
              <ChevronLeft className="me-1 size-4 rtl:rotate-180" />
            </Button>
          ) : (
            <Button type="submit" className="h-12 rounded-xl font-semibold" disabled={loading}>
              {loading ? 'جاري التسجيل…' : 'إرسال طلب التسجيل'}
            </Button>
          )}
        </div>
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
