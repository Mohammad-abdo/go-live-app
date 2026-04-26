import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight, Headphones, LifeBuoy, MessageSquare } from 'lucide-react'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage } from '@/lib/apiResponse'
import * as rider from '@/services/riderService'
import * as driver from '@/services/driverService'

const supportTel = (import.meta.env.VITE_SUPPORT_PHONE || '').replace(/\s/g, '')

/** Figma flow: دعم — روابط حقيقية + أسئلة من الـ API */
export default function Support() {
  const role = getActiveRole()
  const [highlights, setHighlights] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      setLoading(true)
      try {
        const raw = role === 'driver' ? await driver.getHelpCenter() : await rider.getHelpCenter()
        const list = Array.isArray(raw) ? raw : []
        if (!c) setHighlights(list.slice(0, 4))
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

  const row =
    'flex items-center justify-between rounded-[20px] border border-[#F0F2F5] bg-white px-4 py-4 shadow-sm transition-colors hover:bg-[#fafafa]'

  return (
    <div dir="rtl" className="mx-auto max-w-[390px] space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <Link
          to="/app/account"
          className="flex size-9 items-center justify-center rounded-full border border-[#F0F2F5] bg-white shadow-sm"
          aria-label="رجوع"
        >
          <ChevronRight className="size-5 text-primary rtl:rotate-180" />
        </Link>
        <h1 className="text-lg font-bold text-[#0A0C0F]">الدعم</h1>
        <span className="size-9" aria-hidden />
      </div>

      {loading ? <p className="text-sm text-[#52627A]">جاري تحميل المحتوى…</p> : null}

      {!loading && highlights.length > 0 ? (
        <div className="space-y-2 rounded-[20px] border border-[#F0F2F5] bg-white p-3 shadow-sm">
          <p className="px-1 text-xs font-bold text-[#8595AD]">من مركز المساعدة</p>
          <ul className="space-y-2">
            {highlights.map((h) => (
              <li key={h.id} className="rounded-xl bg-[#fafafa] px-3 py-2 text-end">
                <p className="text-sm font-semibold text-[#0A0C0F]">{h.questionAr || h.question}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[#52627A]">{h.answerAr || h.answer}</p>
              </li>
            ))}
          </ul>
          <Link to="/app/help" className="block text-center text-xs font-semibold text-primary hover:underline">
            مركز المساعدة الكامل
          </Link>
        </div>
      ) : null}

      <div className="space-y-2.5">
        <Link to="/app/chat" className={row}>
          <ChevronRight className="size-5 shrink-0 text-[#8595AD] rtl:rotate-180" />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-end">
            <div>
              <p className="font-semibold text-[#0A0C0F]">محادثة الرحلة</p>
              <p className="text-xs text-[#8595AD]">بعد بدء رحلة مع رقمها في الرابط</p>
            </div>
            <MessageSquare className="size-6 shrink-0 text-primary" />
          </div>
        </Link>
        {supportTel ? (
          <a href={`tel:${supportTel}`} className={row}>
            <ChevronRight className="size-5 shrink-0 text-[#8595AD] rtl:rotate-180" />
            <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-end">
              <div>
                <p className="font-semibold text-[#0A0C0F]">اتصال بالدعم</p>
                <p className="text-xs text-[#8595AD]" dir="ltr">
                  {supportTel}
                </p>
              </div>
              <Headphones className="size-6 shrink-0 text-primary" />
            </div>
          </a>
        ) : (
          <div className={`${row} text-end text-sm text-[#52627A]`}>
            لتفعيل الاتصال الهاتفي أضف <span className="font-mono text-xs">VITE_SUPPORT_PHONE</span> في بيئة الواجهة.
          </div>
        )}
        <Link to="/app/help" className={row}>
          <ChevronRight className="size-5 shrink-0 text-[#8595AD] rtl:rotate-180" />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-end">
            <div>
              <p className="font-semibold text-[#0A0C0F]">مركز المساعدة</p>
              <p className="text-xs text-[#8595AD]">أسئلة من الخادم</p>
            </div>
            <LifeBuoy className="size-6 shrink-0 text-primary" />
          </div>
        </Link>
      </div>
    </div>
  )
}
