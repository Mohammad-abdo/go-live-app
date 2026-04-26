import { useEffect } from 'react'
import { dispatchAppNotificationFromSocket } from '@/lib/appNotificationDispatch'
import { connectDriverAppNotificationsSocket } from '@/lib/rideSocket'
import { getActiveRole, getDriverUserIdFromSession } from '@/lib/sessionTokens'

/** In-app notifications for captain (joins `driver-{id}` room). */
export default function DriverAppSocketBridge() {
  useEffect(() => {
    if (getActiveRole() !== 'driver') return undefined
    const driverId = getDriverUserIdFromSession()
    if (!driverId) return undefined
    return connectDriverAppNotificationsSocket({
      driverId,
      onAppNotification: (payload) => dispatchAppNotificationFromSocket(payload),
    })
  }, [])

  return null
}
