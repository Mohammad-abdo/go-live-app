import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage } from '@/lib/apiResponse'
import * as rider from '@/services/riderService'
import * as driver from '@/services/driverService'

export default function HelpCenter() {
  const role = getActiveRole()
  const [faqs, setFaqs] = useState([])
  const [open, setOpen] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      setLoading(true)
      try {
        const raw = role === 'driver' ? await driver.getHelpCenter() : await rider.getHelpCenter()
        if (!c) setFaqs(Array.isArray(raw) ? raw : [])
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

  return (
    <div dir="rtl" className="mx-auto max-w-[390px] space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <Link
          to="/app/support"
          className="flex size-9 items-center justify-center rounded-full border border-[#F0F2F5] bg-white shadow-sm"
          aria-label="رجوع"
        >
          <ChevronRight className="size-5 text-primary rtl:rotate-180" />
        </Link>
        <h1 className="text-lg font-bold text-[#0A0C0F]">مركز المساعدة</h1>
        <span className="size-9" aria-hidden />
      </div>

      {loading ? <p className="text-sm text-[#52627A]">جاري التحميل…</p> : null}

      <div className="space-y-2.5">
        {faqs.map((item, i) => {
          const isOpen = open === i
          const q = item.questionAr || item.question || 'سؤال'
          const a = item.answerAr || item.answer || ''
          return (
            <button
              key={item.id ?? i}
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="w-full rounded-[20px] border border-[#F0F2F5] bg-white px-4 py-3 text-end shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <ChevronDown
                  className={cn('size-5 shrink-0 text-[#8595AD] transition-transform', isOpen && 'rotate-180')}
                />
                <span className="flex-1 font-semibold text-[#0A0C0F]">{q}</span>
              </div>
              {isOpen ? (
                <p className="mt-3 border-t border-[#F0F2F5] pt-3 text-sm leading-relaxed text-[#52627A]">{a}</p>
              ) : null}
            </button>
          )
        })}
      </div>

      {!loading && faqs.length === 0 ? <p className="text-center text-sm text-[#52627A]">لا توجد أسئلة مضافة في الخادم بعد.</p> : null}
    </div>
  )
}
