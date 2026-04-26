import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight } from 'lucide-react'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage } from '@/lib/apiResponse'
import * as rider from '@/services/riderService'
import * as driver from '@/services/driverService'

function titleFromNotification(n) {
  if (n?.type) return String(n.type)
  const d = n?.data
  if (d && typeof d === 'object' && d.title) return String(d.title)
  if (typeof d === 'string') return d
  return 'إشعار'
}

function bodyFromNotification(n) {
  const d = n?.data
  if (d && typeof d === 'object') {
    if (d.body) return String(d.body)
    if (d.message) return String(d.message)
  }
  try {
    return JSON.stringify(d)
  } catch {
    return ''
  }
}

export default function Notifications() {
  const role = getActiveRole()
  const [rows, setRows] = useState([])
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      setLoading(true)
      try {
        if (role === 'driver') {
          const raw = await driver.getNotifications({ page: 1, per_page: 30 })
          if (c) return
          const list = Array.isArray(raw?.data) ? raw.data : []
          setRows(list)
          setOffers([])
        } else {
          const data = await rider.getNotifications()
          if (c) return
          setRows(Array.isArray(data?.notifications) ? data.notifications : [])
          setOffers(Array.isArray(data?.activeOffers) ? data.activeOffers : [])
        }
      } catch (e) {
        if (!c) toast.error(getErrorMessage(e))
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
      setRows((prev) => [n, ...prev.filter((x) => Number(x.id) !== Number(n.id))])
    }
    window.addEventListener('go:app-notification', onSocket)
    return () => window.removeEventListener('go:app-notification', onSocket)
  }, [])

  return (
    <div dir="rtl" className="mx-auto max-w-[390px] pb-8">
      <div className="mb-5 flex items-center justify-between border-b border-[#F0F2F5] pb-4">
        <h1 className="text-lg font-bold text-[#0A0C0F]">الإشعارات</h1>
        <Link
          to="/app/home"
          className="flex size-9 items-center justify-center rounded-full border border-[#F0F2F5] bg-white shadow-sm"
          aria-label="رجوع"
        >
          <ChevronRight className="size-5 text-primary rtl:rotate-180" />
        </Link>
      </div>

      {loading ? <p className="text-center text-sm text-[#52627A]">جاري التحميل…</p> : null}

      {offers.length ? (
        <div className="mb-4 space-y-2">
          <p className="text-sm font-semibold text-ink">عروض نشطة</p>
          {offers.map((o) => (
            <div key={o.id} className="rounded-[20px] border border-primary/20 bg-primary/5 p-3 text-end shadow-sm">
              <p className="font-bold text-[#0A0C0F]">{o.title || o.code}</p>
              {o.discount != null ? <p className="mt-1 text-sm text-[#52627A]">خصم: {o.discount}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      <ul className="flex flex-col gap-2.5">
        {rows.map((n) => (
          <li key={n.id} className="rounded-[20px] border border-[#F0F2F5] bg-white p-4 text-end shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="shrink-0 text-xs text-[#8595AD]">
                {n.createdAt ? new Date(n.createdAt).toLocaleString('ar-EG') : ''}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[#0A0C0F]">{titleFromNotification(n)}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#52627A]">{bodyFromNotification(n)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!loading && rows.length === 0 && offers.length === 0 ? (
        <p className="mt-6 text-center text-sm text-[#52627A]">لا توجد إشعارات حالياً.</p>
      ) : null}
    </div>
  )
}
