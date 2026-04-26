import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const AppChromeContext = createContext(null)

export function AppChromeProvider({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const closeAll = useCallback(() => {
    setMenuOpen(false)
    setNotificationsOpen(false)
  }, [])

  const openMenu = useCallback(() => {
    setNotificationsOpen(false)
    setMenuOpen(true)
  }, [])

  const openNotifications = useCallback(() => {
    setMenuOpen(false)
    setNotificationsOpen(true)
  }, [])

  const value = useMemo(
    () => ({
      menuOpen,
      notificationsOpen,
      setMenuOpen,
      setNotificationsOpen,
      openMenu,
      openNotifications,
      closeAll,
    }),
    [menuOpen, notificationsOpen, openMenu, openNotifications, closeAll],
  )

  return <AppChromeContext.Provider value={value}>{children}</AppChromeContext.Provider>
}

export function useAppChrome() {
  const ctx = useContext(AppChromeContext)
  if (!ctx) throw new Error('useAppChrome must be used within AppChromeProvider')
  return ctx
}
