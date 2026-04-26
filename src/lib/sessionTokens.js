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

export function getActiveRole() {
  try {
    const r = sessionStorage.getItem(SESSION_ACTIVE_ROLE)
    return r === 'driver' ? 'driver' : 'rider'
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
