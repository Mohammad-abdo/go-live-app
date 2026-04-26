import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { getActiveRole } from '@/lib/sessionTokens'
import { resolveMediaUrl } from '@/lib/resolveMediaUrl'
import MobileScreenShell from '@/components/MobileScreenShell'

export default function PersonalInfo() {
  const role = getActiveRole()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    let c = false
    ;(async () => {
      setLoading(true)
      try {
        const path = role === 'driver' ? '/apimobile/driver/profile' : '/apimobile/user/profile'
        const res = await api.get(path)
        const u = res.data?.data?.user || res.data?.data
        if (!c) setUser(u && typeof u === 'object' ? u : null)
      } catch {
        if (!c) setUser(null)
      } finally {
        if (!c) setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [role])

  const name =
    user && (user.firstName || user.lastName)
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : user?.name || '—'
  const phone = user?.contactNumber || user?.phone || '—'
  const email = user?.email || '—'
  const avatarUrl = resolveAvatar(user?.avatar)

  return (
    <MobileScreenShell
      rtl
      title="المعلومات الشخصية"
      headerRight={
        <div className="flex items-center gap-2">
          <Link
            to="/app/personal/edit"
            className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary"
          >
            تعديل
          </Link>
          <Link
            to="/app/home"
            className="flex size-10 items-center justify-center rounded-full border border-[#E8EAEF] bg-white text-primary shadow-sm"
            aria-label="الرئيسية"
          >
            <ChevronRight className="size-5 rtl:rotate-180" />
          </Link>
        </div>
      }
      bodyClassName="px-4 py-5"
    >
      <div className="mx-auto flex max-w-[390px] flex-col gap-4">
        <div className="flex flex-col items-center gap-3 rounded-[24px] border border-[#F0F2F5] bg-white p-6 shadow-sm">
          <div className="size-24 overflow-hidden rounded-full bg-[#E8EAEF] ring-4 ring-primary/10">
            {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : null}
          </div>
          <p className="text-center text-xl font-bold text-[#0A0C0F]">{loading ? '…' : name}</p>
        </div>

        <div className="space-y-0 overflow-hidden rounded-[20px] border border-[#F0F2F5] bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-[#F0F2F5] px-4 py-3 text-end">
            <span className="text-xs font-semibold text-[#8595AD]">الاسم</span>
            <span className="text-base font-medium text-[#0A0C0F]">{loading ? '…' : name}</span>
          </div>
          <div className="flex flex-col gap-1 border-b border-[#F0F2F5] px-4 py-3 text-end">
            <span className="text-xs font-semibold text-[#8595AD]">رقم الجوال</span>
            <span className="font-mono text-base text-[#0A0C0F]" dir="ltr">
              {loading ? '…' : phone}
            </span>
          </div>
          <div className="flex flex-col gap-1 px-4 py-3 text-end">
            <span className="text-xs font-semibold text-[#8595AD]">البريد الإلكتروني</span>
            <span className="break-all text-base text-[#0A0C0F]" dir="ltr">
              {loading ? '…' : email}
            </span>
          </div>
        </div>

        <p className="text-center text-xs leading-relaxed text-[#8595AD]">
          لتعديل البيانات المتقدمة وعناوينك وبطاقات الدفع استخدم الخيارات من القائمة.
        </p>
      </div>
    </MobileScreenShell>
  )
}
