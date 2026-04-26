import { cn } from '@/lib/utils'

/**
 * In-app screen wrapper — Figma Go Back: title bar + scroll body, no fake status bar.
 */
export default function MobileScreenShell({
  children,
  title,
  headerRight,
  rtl = false,
  className = '',
  bodyClassName = '',
}) {
  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className={cn('mx-auto flex w-full max-w-[390px] flex-col bg-white', className)}>
      {(title || headerRight) && (
        <header className="relative flex min-h-[52px] shrink-0 items-center justify-center border-b border-[#F0F2F5] bg-white px-4 py-3">
          {headerRight ? (
            <div className="absolute start-3 top-1/2 flex -translate-y-1/2 items-center">{headerRight}</div>
          ) : null}
          {title ? (
            <h1 className={cn('text-center text-lg font-bold text-[#0A0C0F]', headerRight && 'px-12')}>{title}</h1>
          ) : null}
        </header>
      )}
      <div className={cn('min-h-0 flex-1 overflow-y-auto', bodyClassName)}>{children}</div>
    </div>
  )
}
