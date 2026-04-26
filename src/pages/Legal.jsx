import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import MobileScreenShell from '@/components/MobileScreenShell'

export default function Legal() {
  return (
    <MobileScreenShell
      rtl
      title="الشروط وسياسة الخصوصية"
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
      <div className="mx-auto max-w-[390px] space-y-4 text-end leading-relaxed text-[#52627A]">
        <section className="rounded-[20px] border border-[#F0F2F5] bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-[#0A0C0F]">شروط الاستخدام</h2>
          <p className="mt-2 text-sm">
            باستخدامك لتطبيق GO فإنك توافق على الالتزام بقواعد السلامة، وتقديم معلومات صحيحة، واستخدام الخدمة وفقاً للقوانين
            المعمول بها. يُحدَّث هذا الملخص عند نشر نصوص قانونية كاملة من فريق المنتج.
          </p>
        </section>
        <section className="rounded-[20px] border border-[#F0F2F5] bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-[#0A0C0F]">سياسة الخصوصية</h2>
          <p className="mt-2 text-sm">
            نجمع البيانات اللازمة لتشغيل الرحلات (مثل الموقع أثناء الطلب) وتحسين التجربة. لا تُباع بياناتك الشخصية لجهات
            خارجية لأغراض تسويقية. للتفاصيل الكاملة راجع المستند الرسمي على موقع الشركة أو تواصل مع خدمة العملاء من
            القائمة.
          </p>
        </section>
        <p className="text-center text-xs text-[#8595AD]">
          <Link to="/app/help" className="font-semibold text-primary underline-offset-2 hover:underline">
            مركز المساعدة
          </Link>
        </p>
      </div>
    </MobileScreenShell>
  )
}
