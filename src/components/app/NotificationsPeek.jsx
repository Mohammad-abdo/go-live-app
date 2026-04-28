import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { getActiveRole } from '@/lib/sessionTokens'
import * as rider from '@/services/riderService'
import * as driver from '@/services/driverService'

function titleFromNotification(n) {
  if (n?.type) return String(n.type)
  const d = n?.data
  if (d && typeof d === 'object' && d.title) return String(d.title)
  return 'إشعار'
}

function bodyFromNotification(n) {
  const d = n?.data
  if (d && typeof d === 'object') {
    if (d.body) return String(d.body)
    if (d.message) return String(d.message)
  }
  return ''
}

export default function NotificationsPeek({ onSeeAll }) {
  const role = getActiveRole()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      setLoading(true)
      try {
        if (role === 'driver') {
          const raw = await driver.getNotifications({ page: 1, per_page: 5 })
          if (!c) setRows(Array.isArray(raw?.data) ? raw.data : [])
        } else {
          const data = await rider.getNotifications()
          if (!c) setRows(Array.isArray(data?.notifications) ? data.notifications.slice(0, 5) : [])
        }
      } catch {
        if (!c) setRows([])
      } finally {
        if (!c) setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [role])

  useEffect(() => {
    const onSocket = (e) => {
      const n = e.detail?.notification
      if (!n || n.id == null) return
      setRows((prev) => {
        const merged = [n, ...prev.filter((x) => Number(x.id) !== Number(n.id))]
        return merged.slice(0, 5)
      })
    }
    window.addEventListener('go:app-notification', onSocket)
    return () => window.removeEventListener('go:app-notification', onSocket)
  }, [])

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      {loading ? <p className="py-2 text-center text-xs text-[#8595AD]">جاري التحميل…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="rounded-xl border border-[#F0F2F5] bg-[#FAFBFC] p-3 text-center text-xs text-[#52627A]">لا توجد إشعارات</p>
      ) : null}
      {rows.map((n) => (
        <div key={n.id} className="rounded-xl border border-[#F0F2F5] bg-[#FAFBFC] p-3 text-end">
          <div className="flex items-start justify-between gap-2">
            <span className="shrink-0 text-[11px] text-[#8595AD]">
              {n.createdAt ? new Date(n.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : ''}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0A0C0F]">{titleFromNotification(n)}</p>
              {bodyFromNotification(n) ? (
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#52627A]">{bodyFromNotification(n)}</p>
              ) : null}
            </div>
          </div>
        </div>
      ))}
      <Link
        to="/app/notifications"
        onClick={onSeeAll}
        className="flex items-center justify-center gap-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white"
      >
        عرض كل الإشعارات
        <ChevronLeft className="size-4 rtl:rotate-180" />
      </Link>
    </div>
  )
}
