import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import clsx from 'clsx'
import { useTradeStore } from '../store/useTradeStore'
import { useAccountStore } from '../store/useAccountStore'
import { totalPnl, todayPnl } from '../lib/calculations'
import { formatCurrency, formatSignedCurrency } from '../lib/format'
import AnimatedNumber from './AnimatedNumber'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

interface TopBarProps {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const now = useClock()
  const trades = useTradeStore((s) => s.trades)
  const { currency, startingCapital } = useAccountStore((s) => s.currentAccount)

  const portfolioValue = startingCapital + totalPnl(trades)
  const dayPnl = todayPnl(trades)

  return (
    <div className="flex items-center justify-between border-b border-white/10 bg-gray-900/50 px-4 py-2.5 backdrop-blur-md md:px-8">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <button
          onClick={onMenuClick}
          className="mr-1 rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-gray-100 md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="hidden font-medium uppercase tracking-wider text-gray-400 sm:inline">Live</span>
        <span className="hidden text-gray-700 sm:inline">|</span>
        <span className="hidden font-mono tabular-nums sm:inline">
          {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <span className="font-mono tabular-nums text-gray-400">
          {now.toLocaleTimeString(undefined, { hour12: true })}
        </span>
      </div>

      <div className="hidden items-center gap-4 text-xs sm:flex">
        <div className="flex items-baseline gap-1.5">
          <span className="uppercase tracking-wide text-gray-500">Equity</span>
          <span className="font-mono tabular-nums font-semibold text-gray-100">
            <AnimatedNumber value={portfolioValue} format={(v) => formatCurrency(v, currency)} />
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="uppercase tracking-wide text-gray-500">Today</span>
          <span
            className={clsx(
              'font-mono tabular-nums font-semibold',
              dayPnl > 0 && 'text-profit',
              dayPnl < 0 && 'text-loss',
              dayPnl === 0 && 'text-gray-400',
            )}
          >
            <AnimatedNumber value={dayPnl} format={(v) => formatSignedCurrency(v, currency)} />
          </span>
        </div>
      </div>
    </div>
  )
}
