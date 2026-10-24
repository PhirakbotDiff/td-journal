import clsx from 'clsx'
import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  tone?: 'neutral' | 'profit' | 'loss'
  icon?: ReactNode
  sub?: string
  delay?: number
}

const toneStyles = {
  neutral: {
    bar: 'bg-gray-700',
    badge: 'bg-gray-800 text-gray-400',
    value: 'text-gray-100',
    glow: 'bg-gray-500/10',
  },
  profit: {
    bar: 'bg-profit',
    badge: 'bg-profit/10 text-profit',
    value: 'text-profit',
    glow: 'bg-profit/20',
  },
  loss: {
    bar: 'bg-loss',
    badge: 'bg-loss/10 text-loss',
    value: 'text-loss',
    glow: 'bg-loss/20',
  },
} as const

export default function StatCard({ label, value, tone = 'neutral', icon, sub, delay = 0 }: StatCardProps) {
  const styles = toneStyles[tone]
  return (
    <div
      className="surface-interactive group animate-fade-in-up overflow-hidden p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        className={clsx(
          'pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-100',
          styles.glow,
        )}
      />
      <span className={clsx('absolute inset-y-0 left-0 w-0.5', styles.bar)} />
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        {icon && (
          <span
            className={clsx(
              'flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-inset ring-white/5',
              styles.badge,
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className={clsx('relative mt-3 font-mono text-2xl font-semibold tabular-nums', styles.value)}>
        {value}
      </div>
      {sub && <div className="relative mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  )
}
