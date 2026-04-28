import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Unified “bottom sheet” container for live trip screens.
 *
 * @param {{ className?: string, children: any }} props
 */
export default function LiveTripSheet({ className, children }) {
  return (
    <motion.div
      layout
      initial={{ y: 12, opacity: 0.96 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className={cn(
        'pointer-events-auto relative z-10 flex min-h-0 flex-[1_1_auto] flex-col rounded-t-[32px] bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3 shadow-[0_-16px_48px_rgba(10,12,15,0.12)]',
        className,
      )}
    >
      <div className="mx-auto mb-2 h-1 w-[42px] shrink-0 rounded-full bg-[#D5D9E2]" />
      {children}
    </motion.div>
  )
}

