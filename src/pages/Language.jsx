import { Link } from 'react-router-dom'
import { ChevronRight, Check } from 'lucide-react'
import MobileScreenShell from '@/components/MobileScreenShell'

export default function Language() {
  return (
    <MobileScreenShell
      rtl
      title="اللغة"
      headerRight={
        <Link
          to="/app/home"
          className="flex size-10 items-center justify-center rounded-full border border-[#E8EAEF] bg-white text-primary shadow-sm"
          aria-label="الرئيسية"
        >
          <ChevronRight className="size-5 rtl:rotate-180" />
        </Link>
      }
      bodyClassName="px-4 py-5"
    >
      <div className="mx-auto max-w-[390px] space-y-3">
        <p className="text-end text-sm leading-relaxed text-[#52627A]">
          اختر لغة واجهة التطبيق. المزيد من اللغات يُضاف لاحقاً من الخادم.
        </p>
        <div className="overflow-hidden rounded-[20px] border border-[#F0F2F5] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#F0F2F5] px-4 py-4">
            <Check className="size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1 text-end">
              <p className="font-semibold text-[#0A0C0F]">العربية</p>
              <p className="text-xs text-[#8595AD]">مفعّلة</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-4 opacity-60">
            <span className="size-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1 text-end">
              <p className="font-semibold text-[#0A0C0F]">English</p>
              <p className="text-xs text-[#8595AD]">قريباً</p>
            </div>
          </div>
        </div>
      </div>
    </MobileScreenShell>
  )
}
