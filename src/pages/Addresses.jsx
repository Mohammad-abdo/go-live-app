import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight, MapPin, PlusCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/apiResponse'
import * as rider from '@/services/riderService'

/** عناويني — `GET/POST/DELETE /apimobile/user/addresses` */
export default function Addresses() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await rider.getAddresses()
      setList(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const add = async (e) => {
    e.preventDefault()
    if (!address.trim()) return
    setSaving(true)
    try {
      await rider.addAddress({
        title: title.trim() || undefined,
        address: address.trim(),
        latitude: '',
        longitude: '',
        isDefault: list.length === 0,
      })
      toast.success('تمت إضافة العنوان')
      setTitle('')
      setAddress('')
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    try {
      await rider.deleteAddress(id)
      toast.success('تم الحذف')
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div dir="rtl" className="mx-auto max-w-[390px] space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <Link
          to="/app/account"
          className="flex size-9 items-center justify-center rounded-full border border-[#F0F2F5] bg-white shadow-sm"
          aria-label="رجوع"
        >
          <ChevronRight className="size-5 text-primary rtl:rotate-180" />
        </Link>
        <h1 className="text-lg font-bold text-[#0A0C0F]">عناويني</h1>
        <span className="size-9" aria-hidden />
      </div>

      {loading ? <p className="text-sm text-[#52627A]">جاري التحميل…</p> : null}

      {list.map((a) => (
        <div key={a.id} className="rounded-[20px] border border-[#F0F2F5] bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-[#F0F2F5] pb-4">
            <button type="button" className="flex size-8 items-center justify-center rounded-full border border-[#e0e0e0]" aria-label="حذف" onClick={() => del(a.id)}>
              <Trash2 className="size-4 text-red-500" />
            </button>
            <p className="flex-1 text-end text-base font-semibold text-[#0A0C0F]">{a.title || 'عنوان'}</p>
          </div>
          <div className="mt-3 space-y-2 text-end">
            <div className="flex items-center justify-end gap-1 text-sm text-[#0A0C0F]">
              <span>{a.address}</span>
              <MapPin className="size-4 shrink-0 text-primary" />
            </div>
          </div>
        </div>
      ))}

      <form onSubmit={add} className="space-y-3 rounded-[20px] border border-primary/30 bg-white p-4 shadow-sm">
        <p className="text-end text-sm font-semibold text-ink">إضافة عنوان</p>
        <div className="space-y-1">
          <Label className="text-xs text-[#52627A]">العنوان (مطلوب)</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-11 rounded-xl text-end" required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[#52627A]">العنوان المختصر (مثل: المنزل)</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl text-end" />
        </div>
        <Button type="submit" className="w-full rounded-xl" disabled={saving}>
          {saving ? 'جاري الحفظ…' : 'حفظ'}
        </Button>
      </form>

      <div className="flex items-center justify-end gap-2 rounded-[20px] border border-dashed border-[#E0E4EB] bg-[#fafafa] px-4 py-3 text-sm text-[#52627A]">
        <PlusCircle className="size-5 text-primary" />
        أضف إحداثيات دقيقة لاحقاً من تطبيق الجوال الكامل
      </div>
    </div>
  )
}
