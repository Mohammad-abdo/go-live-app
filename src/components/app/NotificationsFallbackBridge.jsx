import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { getActiveRole } from '@/lib/sessionTokens'
import { playInAppSound } from '@/lib/notificationSound'
import * as rider from '@/services/riderService'
import * as driver from '@/services/driverService'

/**
 * Fallback when realtime sockets fail: poll unread-count and nudge user.
 * We avoid fetching rider notifications list here because the backend marks them read on fetch.
 */
export default function NotificationsFallbackBridge() {
  const lastUnreadRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      const role = getActiveRole()
      try {
        if (role === 'driver') {
          const raw = await driver.getUnreadNotificationCount()
          const unread = Number(raw?.unreadCount ?? raw?.data?.unreadCount ?? 0)
          if (!Number.isFinite(unread)) return
          const prev = lastUnreadRef.current
          lastUnreadRef.current = unread
          if (prev != null && unread > prev) {
            playInAppSound('notification').catch(() => {})
            toast.message('لديك إشعار جديد')
          }
          return
        }

        const raw = await rider.getUnreadNotificationCount()
        const unread = Number(raw?.unreadCount ?? raw?.data?.unreadCount ?? 0)
        if (!Number.isFinite(unread)) return
        const prev = lastUnreadRef.current
        lastUnreadRef.current = unread
        if (prev != null && unread > prev) {
          playInAppSound('notification').catch(() => {})
          toast.message('لديك إشعار جديد')
        }
      } catch {
        // ignore: user may be logged out or server unavailable
      }
    }

    // Prime + poll
    void tick()
    const t = window.setInterval(() => {
      if (!cancelled) void tick()
    }, 15000)

    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [])

  return null
}

