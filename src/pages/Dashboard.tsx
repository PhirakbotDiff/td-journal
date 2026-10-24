import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, DollarSign, Target, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import AnimatedNumber from '../components/AnimatedNumber'
import { useTradeStore } from '../store/useTradeStore'
import { useAccountStore } from '../store/useAccountStore'
import {
  equityCurve,
  totalPnl,
  todayPnl,
  winRate,
  openTrades,
  closedTrades,
  tradePnl,
  tradeStatus,
} from '../lib/calculations'
import { formatCurrency, formatSignedCurrency, formatPercent } from '../lib/format'

export default function Dashboard() {
  const trades = useTradeStore((s) => s.trades)
  const { currency, startingCapital } = useAccountStore((s) => s.currentAccount)

  const curve = useMemo(() => equityCurve(trades, startingCapital), [trades, startingCapital])
  const pnl = useMemo(() => totalPnl(trades), [trades])
  const dayPnl = useMemo(() => todayPnl(trades), [trades])
  const rate = useMemo(() => winRate(trades), [trades])
  const portfolioValue = startingCapital + pnl

  const open = openTrades(trades)
  const closed = closedTrades(trades)

  const recent = useMemo(
    () =>
      [...trades]
        .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
        .slice(0, 6),
    [trades],
  )

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your trading performance."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Portfolio Value"
          value={<AnimatedNumber value={portfolioValue} format={(v) => formatCurrency(v, currency)} />}
          icon={<DollarSign className="h-4 w-4" />}
          sub={`Starting capital ${formatCurrency(startingCapital, currency)}`}
          delay={0}
        />
        <StatCard
          label="Today's P&L"
          value={<AnimatedNumber value={dayPnl} format={(v) => formatSignedCurrency(v, currency)} />}
          tone={dayPnl > 0 ? 'profit' : dayPnl < 0 ? 'loss' : 'neutral'}
          icon={<TrendingUp className="h-4 w-4" />}
          delay={60}
        />
        <StatCard
          label="Win Rate"
          value={<AnimatedNumber value={rate} format={(v) => formatPercent(v)} />}
          icon={<Target className="h-4 w-4" />}
          sub={`${closed.length} closed trades`}
          delay={120}
        />
        <StatCard
          label="Open Positions"
          value={<AnimatedNumber value={open.length} format={(v) => String(Math.round(v))} />}
          icon={<Activity className="h-4 w-4" />}
          sub="Currently in the market"
          delay={180}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div
          className="animate-fade-in-up surface p-5 lg:col-span-2"
          style={{ animationDelay: '220ms' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Cumulative Equity Curve</h2>
            <span className="font-mono text-xs tabular-nums text-gray-500">
              {formatCurrency(portfolioValue, currency)}
            </span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v, currency)}
                  width={90}
                />
                <ReferenceLine
                  y={startingCapital}
                  stroke="#52525b"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Starting capital',
                    position: 'insideTopLeft',
                    fill: '#71717a',
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    boxShadow: '0 12px 24px -12px rgba(0,0,0,0.6)',
                  }}
                  labelStyle={{ color: '#a1a1aa' }}
                  itemStyle={{ fontFamily: 'ui-monospace, monospace' }}
                  formatter={(value: number) => [formatCurrency(value, currency), 'Equity']}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  fill="url(#equityFill)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.35))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="animate-fade-in-up surface p-5"
          style={{ animationDelay: '260ms' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Recent Trades</h2>
            <Link to="/journal" className="text-xs font-medium text-emerald-500 hover:text-emerald-400">
              View all
            </Link>
          </div>
          <div className="space-y-1">
            {recent.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-500">
                No trades yet.{' '}
                <Link to="/journal" className="text-emerald-500 hover:text-emerald-400">
                  Log your first trade
                </Link>
              </div>
            )}
            {recent.map((trade, i) => {
              const status = tradeStatus(trade)
              const p = tradePnl(trade)
              const showPnl = status === 'closed' || trade.currentPrice != null
              return (
                <div
                  key={trade.id}
                  className="flex animate-fade-in-up items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-gray-800/50"
                  style={{ animationDelay: `${300 + i * 40}ms` }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={clsx(
                        'flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold',
                        trade.direction === 'long'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400',
                      )}
                    >
                      {trade.direction === 'long' ? 'L' : 'S'}
                    </span>
                    <div>
                      <div className="font-medium text-gray-100">{trade.symbol}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(trade.entryDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {showPnl ? (
                      <span
                        className={clsx(
                          'font-mono text-sm font-medium tabular-nums',
                          p > 0 && 'text-profit',
                          p < 0 && 'text-loss',
                        )}
                      >
                        {formatSignedCurrency(p, currency)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                        open
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
