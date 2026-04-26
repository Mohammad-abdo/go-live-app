import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Full-height panel from the logical end edge (right in LTR, left in RTL with dir=rtl on panel).
 * @param {{ hideTitle?: boolean }} props — `hideTitle`: only show close (e.g. menu with custom header inside children).
 */
export default function SlideOver({ open, onClose, title, children, className, hideTitle }) {
  const titleId = useId()
  const showTitleBar = !hideTitle
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60]" dir="rtl">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={showTitleBar ? titleId : undefined}
        aria-label={!showTitleBar ? title || 'لوحة' : undefined}
        className={cn(
          'absolute inset-y-0 start-0 z-[61] flex w-[min(100%,340px)] flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200',
          className,
        )}
      >
        <div
          className={cn(
            'flex items-center border-b border-[#F0F2F5] px-4 py-3',
            showTitleBar ? 'justify-between' : 'justify-end',
          )}
        >
          {showTitleBar ? (
            <>
              <button type="button" onClick={onClose} className="rounded-full p-2 text-[#52627A] hover:bg-zinc-100" aria-label="إغلاق">
                <X className="size-5" />
              </button>
              <h2 id={titleId} className="text-base font-bold text-[#0A0C0F]">
                {title}
              </h2>
            </>
          ) : (
            <button type="button" onClick={onClose} className="rounded-full p-2 text-[#52627A] hover:bg-zinc-100" aria-label="إغلاق">
              <X className="size-5" />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">{children}</div>
      </aside>
    </div>
  )
}
