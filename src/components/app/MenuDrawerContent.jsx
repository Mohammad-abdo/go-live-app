import { NavLink } from 'react-router-dom'
import {
  Bell,
  CreditCard,
  Headphones,
  MapPinned,
  MessageSquare,
  Shield,
  User,
  Clock,
  MapPin,
  LifeBuoy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const item =
  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0A0C0F] transition-colors hover:bg-[#F6F7FA]'

const screens = [
  { to: '/app/home', label: 'الرئيسية', Icon: MapPinned },
  { to: '/app/trips', label: 'رحلاتي', Icon: Clock },
  { to: '/app/safety', label: 'السلامة', Icon: Shield },
  { to: '/app/account', label: 'حسابي', Icon: User },
  { to: '/app/payment', label: 'الدفع', Icon: CreditCard },
  { to: '/app/notifications', label: 'الإشعارات', Icon: Bell },
  { to: '/app/chat', label: 'محادثة الرحلة', Icon: MessageSquare },
  { to: '/app/addresses', label: 'عناويني', Icon: MapPin },
  { to: '/app/support', label: 'الدعم', Icon: Headphones },
  { to: '/app/help', label: 'مركز المساعدة', Icon: LifeBuoy },
]

export default function MenuDrawerContent({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 pb-6" dir="rtl">
      <p className="px-2 pb-2 pt-1 text-xs font-bold text-[#8595AD]">التنقل</p>
      {screens.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) => cn(item, isActive && 'bg-primary/8 text-primary')}
        >
          <Icon className="size-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 text-end">{label}</span>
        </NavLink>
      ))}
      <p className="mt-3 px-2 text-[11px] leading-relaxed text-[#8595AD]">
        لبدء محادثة رحلة افتح «محادثة الرحلة» مع <span className="font-mono" dir="ltr">?rideId=</span> في الرابط بعد وجود رحلة.
      </p>
    </nav>
  )
}
