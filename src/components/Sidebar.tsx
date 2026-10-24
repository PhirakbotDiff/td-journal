import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Wallet,
  History,
  BarChart3,
  Calculator,
  Settings as SettingsIcon,
  LineChart,
  LogOut,
  ChevronDown,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/useAuthStore'
import { useAccountStore } from '../store/useAccountStore'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/journal', label: 'Trade Journal', icon: BookOpen },
  { to: '/positions', label: 'Open Positions', icon: Wallet },
  { to: '/history', label: 'Trade History', icon: History },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/risk-calculator', label: 'Risk Calculator', icon: Calculator },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

function AccountSwitcher() {
  const accounts = useAccountStore((s) => s.accounts)
  const currentAccount = useAccountStore((s) => s.currentAccount)
  const setCurrentAccount = useAccountStore((s) => s.setCurrentAccount)
  const [open, setOpen] = useState(false)

  if (accounts.length === 0) return null

  return (
    <div className="relative border-b border-white/10 px-3 py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-gray-950 px-3 py-2 text-left text-sm"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-gray-100">{currentAccount.name}</span>
          <span
            className={clsx(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              currentAccount.kind === 'cent'
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-emerald-500/10 text-emerald-400',
            )}
          >
            {currentAccount.kind}
          </span>
        </span>
        <ChevronDown
          className={clsx('h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="absolute inset-x-3 top-full z-10 mt-1 overflow-hidden rounded-lg border border-white/10 bg-gray-900 shadow-lg">
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setCurrentAccount(a.id)
                setOpen(false)
              }}
              className={clsx(
                'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-800',
                a.id === currentAccount.id ? 'text-emerald-400' : 'text-gray-300',
              )}
            >
              <span className="truncate">{a.name}</span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500">{a.kind}</span>
            </button>
          ))}
          <NavLink
            to="/settings"
            onClick={() => setOpen(false)}
            className="block border-t border-white/10 px-3 py-2 text-xs text-gray-500 hover:bg-gray-800 hover:text-gray-300"
          >
            Manage accounts
          </NavLink>
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const asideRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement as HTMLElement
    closeButtonRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !asideRef.current) return

      const focusables = asideRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [open, onClose])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        ref={asideRef}
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-gray-900 to-gray-950 transition-transform duration-200 md:static md:w-60 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20">
              <LineChart className="h-[18px] w-[18px] text-emerald-400" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-gray-100">
              Trade Journal
            </span>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-gray-100 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <AccountSwitcher />
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-gray-400 hover:bg-gray-800/70 hover:text-gray-100',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-emerald-500" />
                  )}
                  <Icon className="h-4 w-4" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-3 py-3">
          <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2">
            <span className="truncate text-xs text-gray-500" title={user?.email ?? undefined}>
              {user?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="flex shrink-0 items-center gap-1 rounded-md p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-200"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
