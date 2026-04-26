import { toast } from 'sonner'
import { playInAppSound } from '@/lib/notificationSound'

/** Same client may have two Engine.IO connections in the same room during dev — swallow duplicate ids. */
let lastDispatched = { id: null, at: 0 }

function titleFromPayload(payload) {
  const n = payload?.notification
  if (!n) return 'إشعار جديد'
  if (n.type) return String(n.type)
  const d = n.data
  if (d && typeof d === 'object' && d.title) return String(d.title)
  return 'إشعار جديد'
}

/** Called when Socket.IO delivers `app-notification` (after DB save on server). */
export function dispatchAppNotificationFromSocket(payload) {
  const nid = payload?.notification?.id
  const now = Date.now()
  if (nid != null && nid === lastDispatched.id && now - lastDispatched.at < 3000) return
  lastDispatched = { id: nid ?? null, at: now }

  playInAppSound('notification')
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('go:app-notification', { detail: payload }))
  }
  toast.message(titleFromPayload(payload), { duration: 4200 })
}
