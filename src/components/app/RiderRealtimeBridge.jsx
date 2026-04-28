import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { dispatchAppNotificationFromSocket } from '@/lib/appNotificationDispatch'
import { connectRiderUserSocket } from '@/lib/rideSocket'
import { getActiveRole, getRiderUserIdFromSession } from '@/lib/sessionTokens'

function rideIdFromPayload(p) {
  const raw = p?.rideRequestId ?? p?.booking_id ?? p?.rideId
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Keeps rider UI in sync: driver accepts → open trip; driver completes/cancels → refresh route.
 */
export default function RiderRealtimeBridge() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const role = getActiveRole()
  const pathRef = useRef(pathname)
  useEffect(() => {
    pathRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (role !== 'rider') return undefined
    const userId = getRiderUserIdFromSession()
    if (!userId) return undefined

    const disconnect = connectRiderUserSocket({
      userId,
      onAppNotification: (payload) => {
        dispatchAppNotificationFromSocket(payload)
      },
      onRideAssigned: (payload) => {
        const id = rideIdFromPayload(payload)
        if (!id) return
        const here = pathRef.current
        if (here === `/app/trip/${id}`) return
        const status = String(payload?.status || '')
        if (status === 'negotiating') {
          toast.message('عرض سعر من السائق — تم فتح الرحلة')
        } else {
          toast.success('قبل السائق الرحلة')
        }
        navigate(`/app/trip/${id}`, { replace: false })
      },
      onTripCompleted: (payload) => {
        const id = rideIdFromPayload(payload)
        if (!id) return
        const here = pathRef.current
        const onThisTrip = here === `/app/trip/${id}` || here.startsWith(`/app/trip/${id}/`)
        if (onThisTrip) return
        toast.success('أنهى السائق الرحلة')
        navigate(`/app/trip/${id}/rate`, { replace: false })
      },
      onTripCancelled: (payload) => {
        const id = rideIdFromPayload(payload)
        if (!id) return
        if (pathRef.current === `/app/trip/${id}`) return
        toast.message('ألغى السائق الرحلة')
        navigate('/app/trips', { replace: false })
      },
    })

    return disconnect
  }, [role, navigate])

  return null
}
