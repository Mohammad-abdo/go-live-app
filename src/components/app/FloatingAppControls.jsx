import { Bell, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAppChrome } from '@/contexts/AppChromeContext'
import { cn } from '@/lib/utils'

/**
 * Menu + notifications — fixed end.
 * On `/app/home` controls sit at the **top** so they never stack above bottom sheets (z-index trap).
 */
export default function FloatingAppControls() {
  const { pathname } = useLocation()
  const isHome = pathname === '/app/home'
  const { openMenu, openNotifications } = useAppChrome()

  return (
    <div
      className={cn(
        'pointer-events-none fixed end-3 z-[45] flex flex-col gap-2',
        isHome ? 'top-[max(0.75rem,var(--safe-top))]' : 'bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))]',
      )}
    >
      <button
        type="button"
        onClick={openNotifications}
        className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-[#E8EAEF] bg-white/95 text-primary shadow-md backdrop-blur-sm"
        aria-label="الإشعارات"
      >
        <Bell className="size-5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={openMenu}
        className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-[#E8EAEF] bg-white/95 text-primary shadow-md backdrop-blur-sm"
        aria-label="القائمة"
      >
        <Menu className="size-5" strokeWidth={2} />
      </button>
    </div>
  )
}
