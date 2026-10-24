import { useMemo, useState } from 'react'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveBar } from '@nivo/bar'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import MonthlyHeatmap from '../components/MonthlyHeatmap'
import { useTradeStore } from '../store/useTradeStore'
import { useAccountStore } from '../store/useAccountStore'
import {
  closedTrades,
  winRate,
  avgWin,
  avgLoss,
  bestTrade,
  worstTrade,
  pnlBySymbol,
  pnlByMonth,
  allTags,
  tradePnl,
} from '../lib/calculations'
import { formatSignedCurrency, formatPercent } from '../lib/format'

const nivoTheme = {
  background: 'transparent',
  text: { fill: '#a1a1aa', fontSize: 12 },
  axis: {
    domain: { line: { stroke: 'rgba(255,255,255,0.1)' } },
    ticks: {
      line: { stroke: 'rgba(255,255,255,0.1)' },
      text: { fill: '#71717a', fontSize: 11 },
    },
    legend: { text: { fill: '#a1a1aa', fontSize: 12 } },
  },
  grid: { line: { stroke: 'rgba(255,255,255,0.06)', strokeDasharray: '3 3' } },
  tooltip: {
    container: {
      background: '#18181b',
      color: '#e4e4e7',
      fontSize: 12,
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 12px 24px -12px rgba(0,0,0,0.6)',
    },
  },
  labels: { text: { fill: '#f4f4f5', fontSize: 11, fontWeight: 600 } },
}

function ChartTooltip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#18181b] px-3 py-1.5 text-xs text-gray-200 shadow-[0_12px_24px_-12px_rgba(0,0,0,0.6)]">
      <span className="text-gray-500">{label}: </span>
      {value}
    </div>
  )
}

export default function Analytics() {
  const allTrades = useTradeStore((s) => s.trades)
  const currency = useAccountStore((s) => s.currentAccount.currency)
  const [tagFilter, setTagFilter] = useState<string>('all')

  const tags = useMemo(() => allTags(allTrades), [allTrades])
  const trades = useMemo(
    () => (tagFilter === 'all' ? allTrades : allTrades.filter((t) => t.tags.includes(tagFilter))),
    [allTrades, tagFilter],
  )

  const closed = useMemo(() => closedTrades(trades), [trades])
  const rate = useMemo(() => winRate(trades), [trades])
  const wins = closed.filter((t) => tradePnl(t) > 0).length
  const losses = closed.filter((t) => tradePnl(t) <= 0).length
  const aw = useMemo(() => avgWin(trades), [trades])
  const al = useMemo(() => avgLoss(trades), [trades])
  const best = useMemo(() => bestTrade(trades), [trades])
  const worst = useMemo(() => worstTrade(trades), [trades])
  const bySymbol = useMemo(() => pnlBySymbol(trades), [trades])
  const byMonth = useMemo(() => pnlByMonth(trades), [trades])

  const pieData = [
    { id: 'Wins', value: wins },
    { id: 'Losses', value: losses },
  ]

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Performance breakdown across your trading history."
        actions={
          tags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-emerald-500"
            >
              <option value="all">All strategies</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Win Rate"
          value={formatPercent(rate)}
          sub={`${wins}W / ${losses}L`}
          tone="neutral"
          delay={0}
        />
        <StatCard
          label="Average Win"
          value={formatSignedCurrency(aw, currency)}
          tone="profit"
          delay={60}
        />
        <StatCard
          label="Average Loss"
          value={formatSignedCurrency(al, currency)}
          tone="loss"
          delay={120}
        />
        <StatCard
          label="Best Trade"
          value={best ? formatSignedCurrency(tradePnl(best), currency) : '—'}
          sub={best?.symbol}
          tone="profit"
          delay={180}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="animate-fade-in-up surface p-5" style={{ animationDelay: '220ms' }}>
          <h2 className="mb-4 section-title">Win / Loss Ratio</h2>
          {wins + losses === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-500">
              No closed trades yet.
            </div>
          ) : (
            <>
              <div className="relative h-64 w-full">
                <ResponsivePie
                  data={pieData}
                  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  innerRadius={0.68}
                  padAngle={wins > 0 && losses > 0 ? 3 : 0}
                  cornerRadius={6}
                  activeOuterRadiusOffset={6}
                  borderWidth={0}
                  enableArcLabels={false}
                  enableArcLinkLabels={false}
                  isInteractive
                  colors={['#22c55e', '#ef4444']}
                  defs={[
                    {
                      id: 'winsGradient',
                      type: 'linearGradient',
                      colors: [
                        { offset: 0, color: '#4ade80' },
                        { offset: 100, color: '#16a34a' },
                      ],
                    },
                    {
                      id: 'lossesGradient',
                      type: 'linearGradient',
                      colors: [
                        { offset: 0, color: '#f87171' },
                        { offset: 100, color: '#dc2626' },
                      ],
                    },
                  ]}
                  fill={[
                    { match: { id: 'Wins' }, id: 'winsGradient' },
                    { match: { id: 'Losses' }, id: 'lossesGradient' },
                  ]}
                  theme={nivoTheme}
                  tooltip={({ datum }) => <ChartTooltip label={String(datum.id)} value={String(datum.value)} />}
                  animate
                  motionConfig="gentle"
                />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-2xl font-semibold tabular-nums text-gray-100">
                    {formatPercent(rate)}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-gray-500">Win Rate</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-profit" />
                  Wins ({wins})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-loss" />
                  Losses ({losses})
                </span>
              </div>
            </>
          )}
        </div>

        <div className="animate-fade-in-up surface p-5" style={{ animationDelay: '260ms' }}>
          <h2 className="mb-4 section-title">Avg Win vs Avg Loss</h2>
          <div className="h-64 w-full">
            <ResponsiveBar
              data={[
                { name: 'Avg Win', value: aw },
                { name: 'Avg Loss', value: al },
              ]}
              keys={['value']}
              indexBy="name"
              margin={{ top: 10, right: 20, bottom: 30, left: 70 }}
              padding={0.5}
              borderRadius={6}
              colors={(bar) => (bar.data.name === 'Avg Win' ? '#22c55e' : '#ef4444')}
              enableLabel
              label={(d) => formatSignedCurrency(Number(d.value), currency)}
              labelTextColor="#f4f4f5"
              axisTop={null}
              axisRight={null}
              axisBottom={{ tickSize: 0, tickPadding: 8 }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                format: (v) => formatSignedCurrency(Number(v), currency),
              }}
              enableGridX={false}
              gridYValues={5}
              theme={nivoTheme}
              tooltip={({ indexValue, value }) => (
                <ChartTooltip label={String(indexValue)} value={formatSignedCurrency(value, currency)} />
              )}
              animate
              motionConfig="gentle"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 animate-fade-in-up surface p-5" style={{ animationDelay: '300ms' }}>
        <h2 className="mb-4 section-title">P&L by Symbol</h2>
        <div className="h-72 w-full">
          <ResponsiveBar
            data={bySymbol as unknown as Record<string, string | number>[]}
            keys={['pnl']}
            indexBy="symbol"
            layout="horizontal"
            margin={{ top: 10, right: 30, bottom: 30, left: 70 }}
            padding={0.4}
            borderRadius={6}
            colors={(bar) => (Number(bar.data.pnl) >= 0 ? '#22c55e' : '#ef4444')}
            enableLabel
            label={(d) => formatSignedCurrency(Number(d.value), currency)}
            labelTextColor="#f4f4f5"
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 0,
              tickPadding: 8,
              format: (v) => formatSignedCurrency(Number(v), currency),
            }}
            axisLeft={{ tickSize: 0, tickPadding: 8 }}
            enableGridY={false}
            gridXValues={5}
            theme={nivoTheme}
            tooltip={({ indexValue, value }) => (
              <ChartTooltip label={String(indexValue)} value={formatSignedCurrency(value, currency)} />
            )}
            animate
            motionConfig="gentle"
          />
        </div>
      </div>

      <div className="mt-4 animate-fade-in-up surface p-5" style={{ animationDelay: '340ms' }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Monthly Performance</h2>
          {worst && (
            <span className="text-xs text-gray-500">
              Worst trade: {worst.symbol} ({formatSignedCurrency(tradePnl(worst), currency)})
            </span>
          )}
        </div>
        <MonthlyHeatmap data={byMonth} currency={currency} />
      </div>
    </div>
  )
}
