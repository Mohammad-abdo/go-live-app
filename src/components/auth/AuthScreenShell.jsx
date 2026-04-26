/**
 * Shared auth layout — dark canvas + rounded phone frame (aligned with Splash / Onboarding).
 * @param {{ children: React.ReactNode, bottomSlot?: React.ReactNode }} props
 */
export default function AuthScreenShell({ children, bottomSlot }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center bg-[#0A0C0F] px-3 py-5"
      dir="rtl"
    >
      <div
        className="relative flex w-full max-w-[390px] flex-col overflow-hidden rounded-[30px] bg-[#fafafa] shadow-2xl ring-1 ring-white/10"
        style={{ minHeight: 'min(844px, 100svh)' }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-primary/[0.14] to-transparent" aria-hidden />
        <div className="relative flex min-h-0 flex-1 flex-col px-5 pb-3 pt-[max(1.25rem,var(--safe-top))]">{children}</div>
        {bottomSlot ? (
          <div className="border-t border-[#F0F2F5] bg-[#fafafa] px-5 py-3.5 text-[#52627A]">{bottomSlot}</div>
        ) : null}
        <div className="flex h-9 shrink-0 items-center justify-center bg-[#fafafa] pb-2">
          <div className="h-1 w-28 rounded-full bg-[#1b294b]/22" />
        </div>
      </div>
    </div>
  )
}
