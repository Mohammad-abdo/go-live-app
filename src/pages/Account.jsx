import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CreditCard, MapPin, PlusCircle, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getActiveRole,
  setSessionAuth,
  getSessionRiderToken,
  getSessionDriverToken,
  clearSessionAuth,
} from '@/lib/sessionTokens'
import { getErrorMessage } from '@/lib/apiResponse'
import * as rider from '@/services/riderService'
import * as driver from '@/services/driverService'

/**
 * Figma `217:7958` — حسابي (عناوين محفوظة) + ملف المستخدم من الـ API.
 */
export default function Account() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(() => getActiveRole())
  const [addresses, setAddresses] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const path = role === 'driver' ? '/apimobile/driver/profile' : '/apimobile/user/profile'
        const p = await api.get(path)
        if (!cancelled) setProfile(p.data)
      } catch (e) {
        if (!cancelled) setProfile({ error: e?.response?.data?.message || e.message })
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [role])

  useEffect(() => {
    if (role !== 'rider') {
      setAddresses([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const data = await rider.getAddresses()
        if (!cancelled) setAddresses(Array.isArray(data) ? data.slice(0, 3) : [])
      } catch {
        if (!cancelled) setAddresses([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [role])

  const user = profile?.data?.user || profile?.data
  const name =
    user && (user.firstName || user.lastName)
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : user?.name || '—'

  return (
    <div dir="rtl" className="mx-auto max-w-[390px] space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-[#0A0C0F]">حسابي</h1>
        <div className="flex flex-wrap gap-1">
          {getSessionRiderToken() ? (
            <Button
              size="sm"
              variant={role === 'rider' ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => {
                setSessionAuth({ activeRole: 'rider' })
                setRole('rider')
              }}
            >
              راكب
            </Button>
          ) : null}
          {getSessionDriverToken() ? (
            <Button
              size="sm"
              variant={role === 'driver' ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => {
                setSessionAuth({ activeRole: 'driver' })
                setRole('driver')
              }}
            >
              كابتن
            </Button>
          ) : null}
        </div>
      </div>

      {role === 'rider' ? (
        <>
          {addresses.length === 0 ? (
            <p className="rounded-[20px] border border-[#F0F2F5] bg-white px-4 py-4 text-end text-sm text-[#52627A] shadow-sm">
              لا توجد عناوين محفوظة بعد.
            </p>
          ) : (
            addresses.map((a) => (
              <div key={a.id} className="rounded-[20px] border border-[#F0F2F5] bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-[#F0F2F5] pb-4">
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center rounded-full border border-[#e0e0e0]"
                    aria-label="حذف"
                    onClick={async () => {
                      try {
                        await rider.deleteAddress(a.id)
                        toast.success('تم حذف العنوان')
                        setAddresses((prev) => prev.filter((x) => x.id !== a.id))
                      } catch (e) {
                        toast.error(getErrorMessage(e))
                      }
                    }}
                  >
                    <Trash2 className="size-4 text-red-500" />
                  </button>
                  <p className="flex-1 text-end text-base font-semibold leading-relaxed text-[#0A0C0F]">{a.title || 'عنوان'}</p>
                </div>
                <div className="mt-3 space-y-2 text-end">
                  <div className="flex items-center justify-end gap-1 text-sm text-[#0A0C0F]">
                    <span>{a.address}</span>
                    <MapPin className="size-4 shrink-0 text-primary" />
                  </div>
                </div>
              </div>
            ))
          )}
          <Link
            to="/app/addresses"
            className="flex w-full items-center justify-end gap-2 rounded-[20px] border border-primary/30 bg-white px-4 py-3 text-base text-[#0A0C0F]"
          >
            <PlusCircle className="size-6 text-primary" />
            إدارة العناوين
          </Link>
        </>
      ) : (
        <p className="rounded-[20px] border border-[#F0F2F5] bg-white px-4 py-4 text-end text-sm text-[#52627A] shadow-sm">
          عناوين الراكب تظهر عند اختيار دور الراكب أعلاه.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/app/addresses"
          className="flex items-center justify-center rounded-[16px] border border-[#F0F2F5] bg-white py-3 text-center text-xs font-semibold text-[#0A0C0F] shadow-sm"
        >
          عناويني
        </Link>
        <Link
          to="/app/support"
          className="flex items-center justify-center rounded-[16px] border border-[#F0F2F5] bg-white py-3 text-center text-xs font-semibold text-[#0A0C0F] shadow-sm"
        >
          الدعم
        </Link>
        <Link
          to="/app/help"
          className="flex items-center justify-center rounded-[16px] border border-[#F0F2F5] bg-white py-3 text-center text-xs font-semibold text-[#0A0C0F] shadow-sm"
        >
          المساعدة
        </Link>
        <Link
          to="/app/notifications"
          className="flex items-center justify-center rounded-[16px] border border-[#F0F2F5] bg-white py-3 text-center text-xs font-semibold text-[#0A0C0F] shadow-sm"
        >
          الإشعارات
        </Link>
      </div>

      <Link
        to="/app/payment"
        className="flex items-center justify-between rounded-[20px] border border-[#F0F2F5] bg-white px-4 py-4 shadow-sm"
      >
        <span className="text-sm text-[#52627A]">إدارة</span>
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-[#0A0C0F]">الدفع وبطاقاتي</span>
          <CreditCard className="size-5 text-primary" />
        </div>
      </Link>

      <div className="rounded-[20px] border border-[#F0F2F5] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold text-[#8595AD]">الملف ({role === 'driver' ? 'كابتن' : 'راكب'})</p>
        {profile?.error ? (
          <p className="mt-2 text-sm text-red-600">{profile.error}</p>
        ) : (
          <>
            <p className="mt-1 text-xl font-semibold text-ink">{loading ? '…' : name}</p>
            <p className="mt-1 font-mono text-xs text-[#52627A]">المعرف {user?.id ?? '—'}</p>
          </>
        )}
        <Button
          type="button"
          variant="destructive"
          className="mt-4 w-full rounded-xl"
          onClick={async () => {
            try {
              if (role === 'driver') await driver.logoutDriver()
              else if (getSessionRiderToken()) await rider.logoutRider()
            } catch {
              /* ignore network errors on logout */
            }
            clearSessionAuth()
            toast.success('تم تسجيل الخروج')
            navigate('/login', { replace: true })
          }}
        >
          تسجيل الخروج
        </Button>
      </div>

      {!loading && profile && !profile.error ? (
        <div className="flex justify-center">
          <Badge variant="outline" className="text-[10px] text-[#8595AD]">
            متصل بالخادم
          </Badge>
        </div>
      ) : null}
    </div>
  )
}
