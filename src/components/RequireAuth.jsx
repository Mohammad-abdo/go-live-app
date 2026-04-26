import { Navigate, useLocation } from 'react-router-dom'
import { getActiveRole, getSessionDriverToken, getSessionRiderToken } from '@/lib/sessionTokens'

function hasSessionForCurrentRole() {
  return getActiveRole() === 'driver'
    ? Boolean(getSessionDriverToken())
    : Boolean(getSessionRiderToken())
}

export default function RequireAuth({ children }) {
  const location = useLocation()
  if (!hasSessionForCurrentRole()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
