import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Bell,
  ChevronLeft,
  CreditCard,
  Globe,
  Headphones,
  History,
  Info,
  LogOut,
  MapPin,
  Star,
  User,
  Wallet,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { getActiveRole, getSessionDriverToken, getSessionRiderToken, clearSessionAuth } from '@/lib/sessionTokens'
import * as rider from '@/services/riderService'
import * as driver from '@/services/driverService'

const origin = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '')

function resolveAvatar(src) {
  if (!src || typeof src !== 'string') return null
  const s = src.trim()
  if (!s) return null
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.startsWith('//')) return `https:${s}`
  if (!origin) return s.startsWith('/') ? s : `/${s}`
  return `${origin}${s.startsWith('/') ? '' : '/'}${s.replace(/^\//, '')}`
}

const iconWrap =
  'flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F0F2F5] text-[#3D495C] [&_svg]:size-[22px]'

const rowClass =
  'flex w-full items-center gap-3 border-b border-[#F0F2F5] py-3.5 ps-1 pe-1 text-[#0A0C0F] transition-colors hover:bg-[#fafafa] active:bg-[#f4f5f8]'

function MenuRow({ to, label, Icon, onNavigate, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => cn(rowClass, isActive && 'bg-primary/[0.06]')}
    >
      <span className={iconWrap}>
        <Icon aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-end text-[15px] font-semibold leading-snug">{label}</span>
      <ChevronLeft className="size-5 shrink-0 text-[#B3B3B3]" aria-hidden />
    </NavLink>
  )
}

const MENU_ITEMS = [
  { to: '/app/personal', label: 'المعلومات الشخصية', Icon: User, end: true },
  { to: '/app/addresses', label: 'العناوين المحفوظة', Icon: MapPin },
  { to: '/app/payment', label: 'الدفع', Icon: CreditCard },
  { to: '/app/trips', label: 'الرحلات والتتبع', Icon: History },
  { to: '/app/wallet', label: 'المحفظة', Icon: Wallet },
  { to: '/app/notifications', label: 'الإشعارات', Icon: Bell },
  { to: '/app/language', label: 'اللغة', Icon: Globe },
  { to: '/app/support', label: 'خدمة العملاء', Icon: Headphones },
  { to: '/app/legal', label: 'الشروط وسياسة الخصوصية', Icon: Info },
]

export default function MenuDrawerContent({ onNavigate }) {
  const navigate = useNavigate()
  const role = getActiveRole()
  const [profile, setProfile] = useState(null)

  const menuItems = useMemo(
    () => MENU_ITEMS.filter((item) => !(role === 'driver' && item.to === '/app/addresses')),
    [role],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const path = role === 'driver' ? '/apimobile/driver/profile' : '/apimobile/user/profile'
        const p = await api.get(path)
        if (!cancelled) setProfile(p.data)
      } catch {
        if (!cancelled) setProfile(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [role])

  const user = profile?.data?.user || profile?.data
  const name =
    user && (user.firstName || user.lastName)
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : user?.name || 'مستخدم'
  const avatarUrl = resolveAvatar(user?.avatar)
  const rawRating = user?.rating ?? user?.averageRating ?? user?.driverRating
  const ratingNum = Number(rawRating)
  const ratingLabel = Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : null

  const onLogout = async () => {
    try {
      if (role === 'driver') await driver.logoutDriver()
      else if (getSessionRiderToken()) await rider.logoutRider()
    } catch {
      /* ignore */
    }
    clearSessionAuth()
    onNavigate?.()
    toast.success('تم تسجيل الخروج')
    navigate('/login', { replace: true })
  }

  return (
    <nav className="flex flex-col pb-4" dir="rtl">
      <div className="mb-4 flex items-center gap-3 border-b border-[#F0F2F5] px-1 pb-4">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-[#E8EAEF] ring-2 ring-white">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-[#8595AD]">
              <User className="size-7" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 text-end">
          <p className="truncate text-lg font-bold text-[#0A0C0F]">{name}</p>
          <div className="mt-0.5 flex items-center justify-end gap-1">
            <span className="text-sm font-semibold tabular-nums text-[#0A0C0F]">{ratingLabel ?? '—'}</span>
            <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        {menuItems.map(({ to, label, Icon, end }) => (
          <MenuRow key={to} to={to} label={label} Icon={Icon} onNavigate={onNavigate} end={end} />
        ))}
      </div>

      <div className="mt-8 border-t border-[#F0F2F5] pt-2">
        <button type="button" onClick={onLogout} className={cn(rowClass, 'border-b-0 text-[#C62828] hover:bg-red-50')}>
          <span className={cn(iconWrap, 'bg-red-50 text-[#C62828]')}>
            <LogOut aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-end text-[15px] font-semibold">تسجيل الخروج</span>
          <ChevronLeft className="size-5 shrink-0 text-[#B3B3B3]" aria-hidden />
        </button>
      </div>
    </nav>
  )
}
