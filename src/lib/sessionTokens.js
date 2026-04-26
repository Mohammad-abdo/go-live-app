export const SESSION_RIDER = 'go_live_session_rider_token'
export const SESSION_DRIVER = 'go_live_session_driver_token'
export const SESSION_ACTIVE_ROLE = 'go_live_active_role'

export function getSessionRiderToken() {
  try {
    return sessionStorage.getItem(SESSION_RIDER) || ''
  } catch {
    return ''
  }
}

export function getSessionDriverToken() {
  try {
    return sessionStorage.getItem(SESSION_DRIVER) || ''
  } catch {
    return ''
  }
}

/**
 * Active app role. If `SESSION_ACTIVE_ROLE` was cleared but a token remains,
 * infer from which JWT exists so RequireAuth + Home do not treat a captain-only
 * session as "rider" and call `/apimobile/user/*` without a rider token (401).
 */
export function getActiveRole() {
  try {
    const r = sessionStorage.getItem(SESSION_ACTIVE_ROLE)
    if (r === 'driver' || r === 'rider') return r
    const rider = getSessionRiderToken()
    const drv = getSessionDriverToken()
    if (drv && !rider) return 'driver'
    if (rider && !drv) return 'rider'
    return 'rider'
  } catch {
    return 'rider'
  }
}

export function setSessionAuth({ riderToken, driverToken, activeRole }) {
  if (riderToken !== undefined) {
    if (riderToken) sessionStorage.setItem(SESSION_RIDER, riderToken)
    else sessionStorage.removeItem(SESSION_RIDER)
  }
  if (driverToken !== undefined) {
    if (driverToken) sessionStorage.setItem(SESSION_DRIVER, driverToken)
    else sessionStorage.removeItem(SESSION_DRIVER)
  }
  if (activeRole !== undefined) {
    sessionStorage.setItem(SESSION_ACTIVE_ROLE, activeRole === 'driver' ? 'driver' : 'rider')
  }
}

export function clearSessionAuth() {
  sessionStorage.removeItem(SESSION_RIDER)
  sessionStorage.removeItem(SESSION_DRIVER)
  sessionStorage.removeItem(SESSION_ACTIVE_ROLE)
}

export function hasAnySessionToken() {
  return Boolean(getSessionRiderToken() || getSessionDriverToken())
}
