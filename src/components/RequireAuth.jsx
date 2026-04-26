import { Navigate, useLocation } from 'react-router-dom'
import { hasAnySessionToken } from '@/lib/sessionTokens'

export default function RequireAuth({ children }) {
  const location = useLocation()
  if (!hasAnySessionToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
