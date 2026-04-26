import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight, CreditCard, PlusCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage } from '@/lib/apiResponse'
import * as rider from '@/services/riderService'

/**
 * Figma `209:7458` — الدفع + بطاقات المستخدم من الـ API.
 */
export default function Payment() {
  const role = getActiveRole()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [last4, setLast4] = useState('')
  const [brand, setBrand] = useState('VISA')
  const [holder, setHolder] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (role !== 'rider') {
      setCards([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await rider.getBankCards()
      setCards(Array.isArray(list) ? list : [])
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [role])

  const addCard = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await rider.addBankCard({
        cardHolderName: holder.trim() || undefined,
        lastFourDigits: last4,
        brand: brand.trim() || 'Card',
        isDefault: cards.length === 0,
      })
      toast.success('تمت إضافة البطاقة')
      setLast4('')
      setHolder('')
      setShowAdd(false)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    try {
      await rider.removeBankCard(id)
      toast.success('تم الحذف')
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  if (role !== 'rider') {
    return (
      <div dir="rtl" className="mx-auto max-w-[390px] pb-8 text-center text-sm text-[#52627A]">
        إدارة البطاقات متاحة لحساب الراكب. بدّل الدور من حسابي.
        <div className="mt-4">
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/app/account">حسابي</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="mx-auto max-w-[390px] pb-8 font-sans">
      <div className="flex items-center justify-between pb-5 pt-1">
        <span className="size-9 shrink-0" aria-hidden />
        <h1 className="text-lg font-bold text-[#0A0C0F]">الدفع</h1>
        <Link
          to="/app/account"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#F0F2F5] bg-white shadow-sm"
          aria-label="رجوع"
        >
          <ChevronRight className="size-5 text-primary rtl:rotate-180" />
        </Link>
      </div>

      {loading ? <p className="text-sm text-[#52627A]">جاري التحميل…</p> : null}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setShowAdd((s) => !s)}
          className="flex items-center justify-between rounded-[20px] border border-[#F0F2F5] bg-white p-3 shadow-sm"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-primary text-white">
            <PlusCircle className="size-6" strokeWidth={2} />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
            <span className="text-base font-medium text-[#0A0C0F]">أضف بطاقة (آخر 4 أرقام فقط)</span>
            <CreditCard className="size-6 shrink-0 text-primary" strokeWidth={1.5} />
          </div>
        </button>

        {showAdd ? (
          <form onSubmit={addCard} className="space-y-3 rounded-[20px] border border-[#F0F2F5] bg-white p-4 shadow-sm">
            <div className="space-y-1">
              <Label className="text-xs text-[#52627A]">آخر 4 أرقام</Label>
              <Input value={last4} onChange={(e) => setLast4(e.target.value)} className="h-11 rounded-xl text-end" dir="ltr" maxLength={4} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#52627A]">الشبكة (مثلاً VISA)</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} className="h-11 rounded-xl text-end" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#52627A]">اسم حامل البطاقة (اختياري)</Label>
              <Input value={holder} onChange={(e) => setHolder(e.target.value)} className="h-11 rounded-xl text-end" />
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={saving}>
              {saving ? 'جاري الحفظ…' : 'حفظ'}
            </Button>
          </form>
        ) : null}

        <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#F0F2F5] bg-white py-1 shadow-sm">
          {cards.map((c, idx) => (
            <div key={c.id}>
              {idx > 0 ? <div className="mx-3 h-px bg-[#F0F2F5]" /> : null}
              <div className="flex items-center justify-between gap-2 p-3">
                <button type="button" className="flex size-9 items-center justify-center rounded-full border border-red-100" aria-label="حذف" onClick={() => remove(c.id)}>
                  <Trash2 className="size-4 text-red-500" />
                </button>
                <div className="min-w-0 flex-1 text-end">
                  <p className="text-sm text-[#0A0C0F]">**** **** **** {c.lastFourDigits}</p>
                  <p className="text-xs text-[#8595AD]">{c.brand || 'بطاقة'}</p>
                </div>
                <div className="flex h-11 w-[62px] shrink-0 items-center justify-center rounded-lg border border-[#E8EAEF] bg-[#fafafa] text-[10px] font-bold text-[#1a1f71]">
                  {String(c.brand || 'CARD').slice(0, 4).toUpperCase()}
                </div>
              </div>
            </div>
          ))}
          {!cards.length && !loading ? (
            <p className="p-4 text-center text-sm text-[#52627A]">لا توجد بطاقات محفوظة.</p>
          ) : null}
        </div>
      </div>

      <p className={cn('mt-10 text-center text-xs leading-relaxed text-[#8595AD]')}>
        يخزن الخادم آخر 4 أرقام وبيانات تعريفية فقط — لا يُرسل رقم البطاقة الكامل من هذا الاختبار.
      </p>
    </div>
  )
}
