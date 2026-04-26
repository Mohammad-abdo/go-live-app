import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import MobileScreenShell from '@/components/MobileScreenShell'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage } from '@/lib/apiResponse'
import * as rider from '@/services/riderService'
import * as driver from '@/services/driverService'

export default function Safety() {
  const role = getActiveRole()
  const [faqs, setFaqs] = useState([])
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

  const tiles = faqs.slice(0, 8)

  return (
    <div dir="rtl" className="mx-auto max-w-[390px]">
      <MobileScreenShell rtl title="السلامة" bodyClassName="bg-[#fafafa]">
        <div className="p-5">
          {loading ? <p className="text-center text-sm text-[#52627A]">جاري التحميل من الخادم…</p> : null}
          {!loading && tiles.length === 0 ? (
            <p className="text-center text-sm text-[#52627A]">لا توجد محتويات في مركز المساعدة بعد.</p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            {tiles.map((item) => {
              const q = item.questionAr || item.question || '—'
              const a = item.answerAr || item.answer || ''
              return (
                <div
                  key={item.id}
                  className="flex flex-col rounded-[20px] border border-[#F0F2F5] bg-white p-3 text-center shadow-sm"
                >
                  <p className="text-[11px] font-bold leading-tight text-[#0A0C0F]">{q}</p>
                  <div className="mx-auto mt-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <span className="text-2xl">🛡️</span>
                  </div>
                  <p className="mt-2 line-clamp-4 text-[10px] leading-snug text-[#52627A]">{a}</p>
                </div>
              )
            })}
          </div>
        </div>
      </MobileScreenShell>
    </div>
  )
}
