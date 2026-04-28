import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { BadgeCheck, ChevronRight, Mic, Paperclip, Phone, Send, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getActiveRole } from '@/lib/sessionTokens'
import { getErrorMessage } from '@/lib/apiResponse'
import { playInAppSound } from '@/lib/notificationSound'
import { connectRideChatSocket } from '@/lib/rideSocket'
import * as rider from '@/services/riderService'
import { cn } from '@/lib/utils'

const QUICK = ['أين أنت؟', 'مرحبًا', 'لقد وصلت', 'متى ستصل؟', 'نعم']

function formatT(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function todaySessionLabel() {
  try {
    const t = new Date().toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })
    return `اليوم في الساعة ${t}`
  } catch {
    return 'اليوم'
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
  const [driverName, setDriverName] = useState('')
  const [driverAvatar, setDriverAvatar] = useState('')
  const [driverTel, setDriverTel] = useState('')
  const listEndRef = useRef(null)

  const me = useMemo(() => (role === 'driver' ? 'driver' : 'rider'), [role])

  useLayoutEffect(() => {
    listEndRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [rows.length])

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

  useEffect(() => {
    if (!rideId) return
    const disconnect = connectRideChatSocket({
      rideId,
      onChatMessage: (payload) => {
        const msg = payload?.message || payload
        if (!msg || msg.id == null) return
        setRows((prev) => {
          if (prev.some((x) => Number(x.id) === Number(msg.id))) return prev
          return [...prev, msg]
        })
        if (msg.senderType && String(msg.senderType) !== String(me)) {
          playInAppSound('chat').catch(() => {})
        }
      },
      onError: () => {
        // keep REST chat usable even if socket fails
      },
    })
    return disconnect
  }, [rideId, me])

  useEffect(() => {
    if (!rideId || role !== 'rider') return
    let cancelled = false
    ;(async () => {
      try {
        const b = await rider.getBookingById(rideId)
        if (cancelled || !b?.driver) return
        const d = b.driver
        const n = `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'السائق'
        setDriverName(n)
        setDriverAvatar(d.avatar || '')
        setDriverTel(d.contactNumber ? String(d.contactNumber).replace(/\s/g, '') : '')
      } catch {
        /* optional header */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [rideId, role])

  const sendText = async (raw) => {
    const v = String(raw || '').trim()
    if (!v || !rideId) return
    setSending(true)
    try {
      const saved = await rider.sendRideChatMessage(rideId, v)
      setText('')
      setRows((r) => {
        if (saved?.id != null && r.some((x) => Number(x.id) === Number(saved.id))) return r
        return [...r, saved]
      })
      playInAppSound('chat').catch(() => {})
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

  const displayName = driverName || 'محادثة الرحلة'

  return (
    <div dir="rtl" className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col bg-white">
      <header className="sticky top-0 z-10 border-b border-[#EEF0F4] bg-white px-2 py-3 pt-[max(0.35rem,var(--safe-top))]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex justify-end">
            {driverTel ? (
              <a
                href={`tel:${driverTel}`}
                className="relative flex size-10 items-center justify-center rounded-full border border-[#E8EAEF] bg-white text-primary shadow-sm"
                aria-label="اتصال"
              >
                <Phone className="size-[18px]" strokeWidth={2.25} />
                <BadgeCheck
                  className="absolute -bottom-0.5 -end-0.5 size-4 text-emerald-500 drop-shadow-sm ring-2 ring-white"
                  strokeWidth={2.5}
                  aria-hidden
                />
              </a>
            ) : (
              <span className="size-10" />
            )}
          </div>
          <div className="flex flex-col items-center leading-none">
            <span className="text-[22px] font-black tracking-tight text-primary">GO</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/70">Back</span>
          </div>
          <div className="flex justify-start">
            <Link
              to={`/app/trip/${rideId}`}
              className="flex size-10 items-center justify-center rounded-full bg-primary text-white shadow-[0_4px_14px_rgba(92,45,142,0.35)]"
              aria-label="رجوع"
            >
              <ChevronRight className="size-5 rtl:rotate-180" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-[#F4F6FA] pt-3">
          {driverAvatar ? (
            <img src={driverAvatar} alt="" className="size-9 rounded-full object-cover ring-2 ring-primary/15" />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-full bg-[#F4F6FA] ring-2 ring-primary/15">
              <UserRound className="size-4 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1 text-end">
            <p className="truncate text-[15px] font-black text-[#0A0C0F]">{displayName}</p>
            <p className="text-[11px] font-semibold text-[#8595AD]">شريك سائق</p>
          </div>
        </div>
      </header>

      {loading ? <p className="py-8 text-center text-sm text-[#52627A]">جاري التحميل…</p> : null}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#FAFAFA] px-3 py-4">
        <div className="flex justify-center">
          <span className="rounded-full bg-[#ECEEF2] px-3 py-1.5 text-center text-[11px] font-semibold text-[#6B7788]">
            {todaySessionLabel()}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {rows.map((m) => {
            const fromMe = m.senderType === me
            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex gap-2', fromMe ? 'flex-row-reverse' : 'flex-row')}
              >
                <div className="shrink-0 pt-1">
                  {fromMe ? (
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                      <UserRound className="size-4" />
                    </div>
                  ) : driverAvatar ? (
                    <img src={driverAvatar} alt="" className="size-8 rounded-full object-cover ring-1 ring-[#E8EAEF]" />
                  ) : (
                    <div className="size-8 rounded-full bg-[#E0E4EB]" />
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[80%] rounded-[18px] px-3.5 py-2.5 text-[14px] leading-relaxed',
                    fromMe
                      ? 'rounded-br-sm border border-[#E4E7ED] bg-white text-[#0A0C0F] shadow-sm'
                      : 'rounded-bl-sm bg-[#ECEEF2] text-[#0A0C0F]',
                  )}
                >
                  <p className="text-end">{m.message}</p>
                  <p className="mt-1 text-end text-[10px] text-[#8595AD]">{formatT(m.createdAt)}</p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={listEndRef} className="h-1 shrink-0" aria-hidden />
      </div>

      <div className="sticky bottom-0 border-t border-[#EEF0F4] bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mb-2 flex flex-wrap justify-end gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              disabled={sending}
              onClick={() => sendText(q)}
              className="rounded-full border-2 border-[#C4E86A] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0A0C0F] shadow-sm transition hover:bg-[#f8fff0]"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 pb-1">
          <button
            type="button"
            className="mb-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-[#E8EAEF] bg-[#F7F8FA] text-[#52627A]"
            aria-label="صوت"
            onClick={() => toast.message('التسجيل الصوتي غير مفعّل في النسخة التجريبية')}
          >
            <Mic className="size-[18px]" />
          </button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendText(text)}
            placeholder="اكتب"
            className="min-h-11 flex-1 rounded-[22px] border-[#E4E7ED] bg-[#F4F6FA] text-end text-sm font-medium shadow-inner"
            dir="rtl"
          />
          <button
            type="button"
            className="mb-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-[#E8EAEF] bg-[#F7F8FA] text-[#52627A]"
            aria-label="مرفقات"
            onClick={() => toast.message('المرفقات غير مفعّلة في النسخة التجريبية')}
          >
            <Paperclip className="size-[18px]" />
          </button>
          <Button
            type="button"
            size="icon"
            className="mb-0.5 size-10 shrink-0 rounded-full shadow-md"
            onClick={() => sendText(text)}
            disabled={sending || !text.trim()}
            aria-label="إرسال"
          >
            <Send className="size-5" />
          </Button>
        </div>
        <p className="pb-1 text-center text-[10px] text-[#8595AD]">دورك كـ {senderType === 'driver' ? 'كابتن' : 'راكب'}</p>
      </div>
    </div>
  )
}
