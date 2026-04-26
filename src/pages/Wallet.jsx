import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { unwrapData, getErrorMessage } from '@/lib/apiResponse'
import { getActiveRole } from '@/lib/sessionTokens'
import MobileScreenShell from '@/components/MobileScreenShell'
import { toast } from 'sonner'

export default function Wallet() {
  const role = getActiveRole()
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(null)
  const [currency, setCurrency] = useState('EGP')
  const [ops, setOps] = useState([])

  useEffect(() => {
    let c = false
    ;(async () => {
      setLoading(true)
      try {
        if (role === 'driver') {
          const res = await api.get('/apimobile/driver/wallet/operations', { params: { limit: 15 } })
          const data = unwrapData(res)
          const w = data?.wallet
          if (!c) {
            setBalance(w?.balance ?? data?.balance ?? 0)
            setCurrency(w?.currency || 'EGP')
            setOps(Array.isArray(data?.operations) ? data.operations : [])
          }
        } else {
          const res = await api.get('/apimobile/user/wallet/operations', { params: { limit: 15 } })
          const data = unwrapData(res)
          const w = data?.wallet
          if (!c) {
            setBalance(w?.balance ?? 0)
            setCurrency(w?.currency || 'EGP')
            setOps(Array.isArray(data?.operations) ? data.operations : [])
          }
        }
      } catch (e) {
        if (!c) {
          toast.error(getErrorMessage(e))
          setBalance(null)
          setOps([])
        }
      } finally {
        if (!c) setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [role])

  return (
    <MobileScreenShell
      rtl
      title="المحفظة"
      headerRight={
        <Link
          to="/app/home"
          className="flex size-10 items-center justify-center rounded-full border border-[#E8EAEF] bg-white text-primary shadow-sm"
          aria-label="الرئيسية"
        >
          <ChevronRight className="size-5 rtl:rotate-180" />
        </Link>
      }
      bodyClassName="px-4 py-5"
    >
      <div className="mx-auto max-w-[390px] space-y-4">
        <div className="rounded-[24px] border border-[#F0F2F5] bg-gradient-to-br from-primary/10 to-white p-6 text-end shadow-sm">
          <p className="text-sm font-medium text-[#52627A]">الرصيد الحالي</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[#0A0C0F]">
            {loading ? '…' : balance != null ? `${Number(balance).toFixed(2)}` : '—'}{' '}
            <span className="text-lg font-semibold text-[#52627A]">{currency}</span>
          </p>
        </div>

        <p className="text-end text-sm font-semibold text-[#0A0C0F]">آخر العمليات</p>
        <div className="space-y-2">
          {loading ? (
            <p className="text-end text-sm text-[#8595AD]">جاري التحميل…</p>
          ) : ops.length === 0 ? (
            <p className="rounded-[16px] border border-[#F0F2F5] bg-white px-4 py-6 text-center text-sm text-[#52627A]">لا توجد عمليات بعد.</p>
          ) : (
            ops.map((o) => (
              <div
                key={o.id}
                className="flex flex-col gap-1 rounded-[16px] border border-[#F0F2F5] bg-white px-4 py-3 text-end shadow-sm"
              >
                <span className="text-xs text-[#8595AD]">{o.transactionType || o.type || 'عملية'}</span>
                <span className="text-base font-semibold tabular-nums text-[#0A0C0F]">
                  {o.amount != null ? `${Number(o.amount).toFixed(2)} ${currency}` : '—'}
                </span>
                {o.description ? <span className="text-xs text-[#52627A]">{o.description}</span> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </MobileScreenShell>
  )
}
