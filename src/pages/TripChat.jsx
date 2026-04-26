import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage } from '@/lib/apiResponse'
import * as rider from '@/services/riderService'

function formatT(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

/** محادثة الرحلة — `GET/POST /apimobile/chat/rides/:rideId/messages` */
export default function TripChat() {
  const [params] = useSearchParams()
  const rideId = params.get('rideId') || ''
  const role = getActiveRole()

  const [rows, setRows] = useState([])
  const [senderType, setSenderType] = useState('rider')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const me = useMemo(() => (role === 'driver' ? 'driver' : 'rider'), [role])

  const load = useCallback(async () => {
    if (!rideId) return
    setLoading(true)
    try {
      const data = await rider.getRideChat(rideId, { limit: 50 })
      const list = Array.isArray(data?.messages) ? data.messages : []
      setSenderType(data?.senderType || me)
      setRows(list)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [rideId, me])

  useEffect(() => {
    load()
  }, [load])

  const send = async () => {
    const v = text.trim()
    if (!v || !rideId) return
    setSending(true)
    try {
      const saved = await rider.sendRideChatMessage(rideId, v)
      setText('')
      setRows((r) => [...r, saved])
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  if (!rideId) {
    return (
      <div dir="rtl" className="mx-auto max-w-[390px] p-4 text-center text-sm text-[#52627A]">
        أضف معرف الرحلة في الرابط: <span className="font-mono">/app/chat?rideId=123</span>
        <div className="mt-4">
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/app/trips">رجوع</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="mx-auto flex min-h-[55vh] max-w-[390px] flex-col pb-4">
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/app/trips"
          className="flex size-9 items-center justify-center rounded-full border border-[#F0F2F5] bg-white shadow-sm"
          aria-label="رجوع"
        >
          <ChevronRight className="size-5 text-primary rtl:rotate-180" />
        </Link>
        <h1 className="text-lg font-bold text-[#0A0C0F]">محادثة الرحلة</h1>
        <span className="size-9" aria-hidden />
      </div>

      {loading ? <p className="text-center text-sm text-[#52627A]">جاري التحميل…</p> : null}

      <div className="flex flex-1 flex-col gap-2 rounded-[20px] border border-[#F0F2F5] bg-[#F4F6FA] p-3">
        {rows.map((m) => {
          const fromMe = m.senderType === me
          return (
            <div key={m.id} className={fromMe ? 'ms-8 flex justify-end' : 'me-8 flex justify-start'}>
              <div
                className={
                  fromMe
                    ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-white'
                    : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-ink shadow-sm'
                }
              >
                <p className="text-end leading-relaxed">{m.message}</p>
                <p className="mt-1 text-end text-[10px] opacity-70">{formatT(m.createdAt)}</p>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-2 text-center text-[10px] text-[#8595AD]">دورك كـ {senderType === 'driver' ? 'كابتن' : 'راكب'}</p>

      <div className="mt-3 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="اكتب رسالة…"
          className="h-11 flex-1 rounded-xl text-end"
          dir="rtl"
        />
        <Button type="button" size="icon" className="size-11 shrink-0 rounded-xl" onClick={send} disabled={sending} aria-label="إرسال">
          <Send className="size-5" />
        </Button>
      </div>
    </div>
  )
}
