import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Unified header for live trip sheets: back button + status pill.
 *
 * @param {{ className?: string, backTo: string, statusText: string, compact?: boolean }} props
 */
export default function LiveTripSheetHeader({ className, backTo, statusText, compact = false }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-2', className)}>
      <Link
        to={backTo}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full border bg-white text-primary',
          compact ? 'size-10 border-[#F4F4F4] shadow-sm' : 'size-11 border-[#EEF0F4] shadow-[0_2px_12px_rgba(92,45,142,0.12)]',
        )}
        aria-label="رجوع"
      >
        <ChevronRight className="size-5 rtl:rotate-180" />
      </Link>
      <span
        className={cn(
          'rounded-full px-3 py-1 text-[11px] font-semibold',
          compact ? 'border border-[#F4F4F4] bg-white text-[#111827]' : 'bg-[#F4F6FA] text-[#52627A]',
        )}
      >
        {statusText}
      </span>
    </div>
  )
}

