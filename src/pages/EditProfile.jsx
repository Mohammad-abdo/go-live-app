import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MobileScreenShell from '@/components/MobileScreenShell'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage } from '@/lib/apiResponse'
import * as rider from '@/services/riderService'
import * as driver from '@/services/driverService'
import { cn } from '@/lib/utils'

export default function EditProfile() {
  const navigate = useNavigate()
  const role = getActiveRole()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carColor, setCarColor] = useState('')
  const [carPlate, setCarPlate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (role === 'driver') {
        const p = await driver.getDriverProfile()
        if (p && typeof p === 'object') {
          setFirstName(String(p.firstName || ''))
          setLastName(String(p.lastName || ''))
          setEmail(String(p.email || ''))
          const det = p.userDetail
          if (det && typeof det === 'object') {
            setCarModel(String(det.carModel || ''))
            setCarColor(String(det.carColor || ''))
            setCarPlate(String(det.carPlateNumber || ''))
          }
        }
      } else {
        const u = await rider.getRiderProfile()
        if (u && typeof u === 'object') {
          setFirstName(String(u.firstName || ''))
          setLastName(String(u.lastName || ''))
          setEmail(String(u.email || ''))
        }
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    load()
  }, [load])

  const onSave = async () => {
    setSaving(true)
    try {
      if (role === 'driver') {
        await driver.updateDriverProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
        })
        await driver.updateDriverVehicle({
          carModel: carModel.trim(),
          carColor: carColor.trim(),
          carPlateNumber: carPlate.trim(),
        })
        toast.success('تم حفظ الملف والمركبة')
      } else {
        await rider.updateRiderProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
        })
        toast.success('تم حفظ الملف')
      }
      navigate('/app/personal', { replace: true })
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <MobileScreenShell
      rtl
      title="تعديل الملف"
      headerRight={
        <Link
          to="/app/personal"
          className="flex size-10 items-center justify-center rounded-full border border-[#E8EAEF] bg-white text-primary shadow-sm"
          aria-label="رجوع"
        >
          <ChevronRight className="size-5 rtl:rotate-180" />
        </Link>
      }
      bodyClassName="px-4 py-5"
    >
      <div className="mx-auto flex max-w-[390px] flex-col gap-4">
        <p className="text-end text-xs text-[#8595AD]">
          يتم الإرسال إلى نفس مسارات Swagger:{' '}
          <span dir="ltr" className="font-mono text-[11px]">
            {role === 'driver' ? 'PUT /apimobile/driver/profile/update' : 'PUT /apimobile/user/profile/update'}
          </span>
          {role === 'driver' ? (
            <>
              {' '}
              و<span dir="ltr" className="font-mono text-[11px]">
                PUT /apimobile/driver/vehicle/update
              </span>
            </>
          ) : null}
        </p>

        <div className="space-y-3 rounded-[20px] border border-[#F0F2F5] bg-white p-4 shadow-sm">
          <label className="block text-end">
            <span className="text-xs font-semibold text-[#8595AD]">الاسم الأول</span>
            <input
              className={cn(
                'mt-1 w-full rounded-xl border border-[#E8EAEF] bg-[#FAFBFC] px-3 py-2.5 text-end text-sm',
                loading && 'opacity-50',
              )}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
            />
          </label>
          <label className="block text-end">
            <span className="text-xs font-semibold text-[#8595AD]">اسم العائلة</span>
            <input
              className={cn(
                'mt-1 w-full rounded-xl border border-[#E8EAEF] bg-[#FAFBFC] px-3 py-2.5 text-end text-sm',
                loading && 'opacity-50',
              )}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
            />
          </label>
          <label className="block text-end">
            <span className="text-xs font-semibold text-[#8595AD]">البريد</span>
            <input
              type="email"
              dir="ltr"
              className={cn(
                'mt-1 w-full rounded-xl border border-[#E8EAEF] bg-[#FAFBFC] px-3 py-2.5 text-start text-sm',
                loading && 'opacity-50',
              )}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </label>
        </div>

        {role === 'driver' ? (
          <div className="space-y-3 rounded-[20px] border border-[#F0F2F5] bg-white p-4 shadow-sm">
            <p className="text-end text-sm font-bold text-[#0A0C0F]">المركبة</p>
            <label className="block text-end">
              <span className="text-xs font-semibold text-[#8595AD]">الموديل</span>
              <input
                className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-[#FAFBFC] px-3 py-2.5 text-end text-sm"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
                disabled={loading}
              />
            </label>
            <label className="block text-end">
              <span className="text-xs font-semibold text-[#8595AD]">اللون</span>
              <input
                className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-[#FAFBFC] px-3 py-2.5 text-end text-sm"
                value={carColor}
                onChange={(e) => setCarColor(e.target.value)}
                disabled={loading}
              />
            </label>
            <label className="block text-end">
              <span className="text-xs font-semibold text-[#8595AD]">لوحة الأرقام</span>
              <input
                dir="ltr"
                className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-[#FAFBFC] px-3 py-2.5 text-start text-sm font-mono"
                value={carPlate}
                onChange={(e) => setCarPlate(e.target.value)}
                disabled={loading}
              />
            </label>
          </div>
        ) : null}

        <Button type="button" className="h-12 rounded-2xl text-base font-semibold" disabled={saving || loading} onClick={onSave}>
          {saving ? 'جاري الحفظ…' : 'حفظ'}
        </Button>
      </div>
    </MobileScreenShell>
  )
}
