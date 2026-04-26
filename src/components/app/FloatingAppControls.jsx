import { Bell, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { GoLogoMark } from '@/components/branding/GoLogoMark'
import { useAppChrome } from '@/contexts/AppChromeContext'
import { getActiveRole } from '@/lib/sessionTokens'
import { cn } from '@/lib/utils'

/**
 * Menu + notifications — fixed end.
 * On `/app/home` controls sit at the **top** so they never stack above bottom sheets (z-index trap).
 */
export default function FloatingAppControls() {
  const { pathname } = useLocation()
  const controlsAtTop = pathname === '/app/home' || /^\/app\/trip\/[^/]+$/.test(pathname)
  const { openMenu, openNotifications } = useAppChrome()
  const showDriverHomeLogo = pathname === '/app/home' && getActiveRole() === 'driver'

  return (
    <div
      className={cn(
        'pointer-events-none fixed end-3 z-[45] flex flex-col gap-2',
        controlsAtTop ? 'top-[max(0.75rem,var(--safe-top))]' : 'bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))]',
      )}
    >
      {showDriverHomeLogo ? (
        <div
          className="pointer-events-none flex size-11 items-center justify-center rounded-full border border-[#E8EAEF] bg-white/95 shadow-md backdrop-blur-sm"
          aria-hidden
        >
          <GoLogoMark size="sm" className="text-primary drop-shadow-sm" />
        </div>
      ) : null}
      <button
        type="button"
        onClick={openMenu}
        className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-[#E8EAEF] bg-white/95 text-primary shadow-md backdrop-blur-sm"
        aria-label="القائمة"
      >
        <Menu className="size-5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={openNotifications}
        className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-[#E8EAEF] bg-white/95 text-primary shadow-md backdrop-blur-sm"
        aria-label="الإشعارات"
      >
        <Bell className="size-5" strokeWidth={2} />
      </button>
    </div>
  )
}
