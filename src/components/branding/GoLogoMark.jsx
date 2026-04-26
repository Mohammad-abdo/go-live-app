import { cn } from '@/lib/utils'

/** شعار GO — بنفسجي مع لمسة فيروزية على حرف G (كما في تصميم الشاشات). */
export function GoLogoMark({ className, size = 'lg' }) {
  const sz =
    size === 'sm' ? 'text-[1.65rem]' : size === 'md' ? 'text-[2rem]' : 'text-[2.45rem]'
  return (
    <div className={cn('inline-flex items-baseline gap-0.5 font-black leading-none tracking-tight', sz, className)}>
      <span className="relative text-primary">
        G
        <span
          className="pointer-events-none absolute end-0 top-[0.2em] size-[0.28em] min-h-[5px] min-w-[5px] rotate-45 bg-cyan-400 shadow-sm ring-1 ring-white/80"
          aria-hidden
        />
      </span>
      <span className="relative -ms-0.5 text-primary">
        O
        <span
          className="pointer-events-none absolute inset-x-[14%] bottom-[22%] top-[40%] rounded-full border-[0.08em] border-primary/45 bg-primary/[0.07]"
          aria-hidden
        />
      </span>
    </div>
  )
}
