import { Outlet, useLocation } from 'react-router-dom'
import RiderRealtimeBridge from '@/components/app/RiderRealtimeBridge'
import FloatingAppControls from '@/components/app/FloatingAppControls'
import MenuDrawerContent from '@/components/app/MenuDrawerContent'
import NotificationsPeek from '@/components/app/NotificationsPeek'
import SlideOver from '@/components/app/SlideOver'
import { AppChromeProvider, useAppChrome } from '@/contexts/AppChromeContext'
import { cn } from '@/lib/utils'

function AppShellInner() {
  const { pathname } = useLocation()
  const isFullBleedMap = pathname === '/app/home' || /^\/app\/trip\/[^/]+$/.test(pathname)
  const { menuOpen, notificationsOpen, setMenuOpen, setNotificationsOpen } = useAppChrome()

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col bg-[#fafafa]">
      <SlideOver open={menuOpen} onClose={() => setMenuOpen(false)} title="القائمة" hideTitle>
        <MenuDrawerContent onNavigate={() => setMenuOpen(false)} />
      </SlideOver>
      <SlideOver open={notificationsOpen} onClose={() => setNotificationsOpen(false)} title="الإشعارات">
        <NotificationsPeek
          onSeeAll={() => {
            setNotificationsOpen(false)
          }}
        />
      </SlideOver>
      <FloatingAppControls />
      <RiderRealtimeBridge />
      <main
        className={cn(
          'relative z-0 flex min-h-0 flex-1 flex-col pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]',
          isFullBleedMap ? 'px-0 pt-0' : 'px-4 pt-4',
        )}
      >
        <div className="relative z-[1] min-h-0 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default function AppShell() {
  return (
    <AppChromeProvider>
      <AppShellInner />
    </AppChromeProvider>
  )
}
