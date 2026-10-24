import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Check, RefreshCw } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import AnimatedNumber from '../components/AnimatedNumber'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { useTradeStore } from '../store/useTradeStore'
import { useAccountStore } from '../store/useAccountStore'
import { openTrades, tradePnl } from '../lib/calculations'
import { formatSignedCurrency } from '../lib/format'
import { isXauSymbol, fetchXauPrice } from '../lib/livePrice'
import clsx from 'clsx'

export default function OpenPositions() {
  const trades = useTradeStore((s) => s.trades)
  const setCurrentPrice = useTradeStore((s) => s.setCurrentPrice)
  const closeTrade = useTradeStore((s) => s.closeTrade)
  const currency = useAccountStore((s) => s.currentAccount.currency)
  const { toast, showResult } = useToast()

  const positions = useMemo(() => openTrades(trades), [trades])
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({})
  const [closingId, setClosingId] = useState<string | null>(null)
  const [closePrice, setClosePrice] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const hasXauPosition = positions.some((t) => isXauSymbol(t.symbol))

  const positionsRef = useRef(positions)
  positionsRef.current = positions

  useEffect(() => {
    if (!autoRefresh) return

    async function tick() {
      const xauPositions = positionsRef.current.filter((t) => isXauSymbol(t.symbol))
      if (xauPositions.length === 0) return
      try {
        const price = await fetchXauPrice()
        await Promise.all(xauPositions.map((t) => setCurrentPrice(t.id, price)))
      } catch {
        // Silent in the background — the per-row "Live" button surfaces errors directly.
      }
    }

    tick()
    const interval = setInterval(tick, 30_000)
    return () => clearInterval(interval)
  }, [autoRefresh, setCurrentPrice])

  function handlePriceInput(id: string, value: string) {
    setPriceDrafts((d) => ({ ...d, [id]: value }))
  }

  async function applyPrice(trade: (typeof positions)[number]) {
    const value = Number(priceDrafts[trade.id])
    if (!value) return
    const errorMessage = await setCurrentPrice(trade.id, value)
    showResult(errorMessage, `${trade.symbol} price updated`)
  }

  function startClose(id: string, suggested: number | null) {
    setClosingId(id)
    setClosePrice(suggested != null ? String(suggested) : '')
  }

  async function confirmClose(trade: (typeof positions)[number]) {
    const price = Number(closePrice)
    if (!price) return
    const errorMessage = await closeTrade(trade.id, price, new Date().toISOString())
    showResult(errorMessage, `${trade.symbol} trade closed`)
    setClosingId(null)
    setClosePrice('')
  }

  const totalUnrealized = positions.reduce((sum, t) => sum + tradePnl(t), 0)

  return (
    <div>
      <PageHeader
        title="Open Positions"
        description="Currently open trades. Enter a current price to track unrealized P&L."
        actions={
          hasXauPosition && (
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={clsx(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-transform active:scale-95',
                autoRefresh
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  : 'border-gray-700 text-gray-400 hover:bg-gray-800',
              )}
            >
              <RefreshCw className={clsx('h-3.5 w-3.5', autoRefresh && 'animate-spin [animation-duration:3s]')} />
              Auto-refresh XAU {autoRefresh ? 'on' : 'off'}
            </button>
          )
        }
      />

      <Toast toast={toast} />

      <div className="mb-6 surface p-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Total Unrealized P&L</span>
        <div
          className={clsx(
            'mt-1 font-mono text-2xl font-semibold tabular-nums',
            totalUnrealized > 0 && 'text-profit',
            totalUnrealized < 0 && 'text-loss',
            totalUnrealized === 0 && 'text-gray-100',
          )}
        >
          <AnimatedNumber value={totalUnrealized} format={(v) => formatSignedCurrency(v, currency)} />
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="surface px-4 py-10 text-center text-gray-500 md:hidden">
          No open positions.
        </div>
      ) : (
        <div className="space-y-3 md:hidden">
          {positions.map((trade, i) => {
            const pnl = tradePnl(trade)
            const isClosing = closingId === trade.id
            return (
              <div
                key={trade.id}
                className="animate-fade-in-up surface p-4"
                style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-100">{trade.symbol}</span>
                  <span
                    className={clsx(
                      'rounded px-1.5 py-0.5 text-xs font-semibold uppercase',
                      trade.direction === 'long'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400',
                    )}
                  >
                    {trade.direction}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500">Entry</div>
                    <div className="font-mono tabular-nums text-gray-200">{trade.entryPrice}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Qty</div>
                    <div className="font-mono tabular-nums text-gray-200">{trade.quantity}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-gray-500">Current Price</div>
                  <div className="mt-1">
                    {isXauSymbol(trade.symbol) ? (
                      <div className="flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                        </span>
                        <span className="font-mono text-sm tabular-nums text-gray-100">
                          {trade.currentPrice != null ? trade.currentPrice : 'waiting for price...'}
                        </span>
                        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                          live
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="any"
                          placeholder={trade.currentPrice != null ? String(trade.currentPrice) : 'price'}
                          value={priceDrafts[trade.id] ?? ''}
                          onChange={(e) => handlePriceInput(trade.id, e.target.value)}
                          className="w-full rounded-md border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() => applyPrice(trade)}
                          className="shrink-0 rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-transform hover:bg-gray-800 active:scale-95"
                        >
                          Set
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
                  <div>
                    <div className="text-xs text-gray-500">Unrealized P&L</div>
                    <div
                      className={clsx(
                        'font-mono text-lg font-semibold tabular-nums',
                        trade.currentPrice == null
                          ? 'text-gray-500'
                          : pnl > 0
                            ? 'text-profit'
                            : pnl < 0
                              ? 'text-loss'
                              : 'text-gray-300',
                      )}
                    >
                      {trade.currentPrice != null ? formatSignedCurrency(pnl, currency) : '—'}
                    </div>
                  </div>

                  {isClosing ? (
                    <div className="flex animate-slide-down items-center gap-1.5">
                      <input
                        type="number"
                        step="any"
                        placeholder="exit price"
                        value={closePrice}
                        onChange={(e) => setClosePrice(e.target.value)}
                        className="w-20 rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-sm text-gray-100 outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => confirmClose(trade)}
                        className="rounded-md bg-emerald-600 p-1.5 text-white transition-transform hover:bg-emerald-500 active:scale-90"
                        aria-label="Confirm close"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setClosingId(null)}
                        className="rounded-md border border-gray-700 p-1.5 text-gray-300 transition-transform hover:bg-gray-800 active:scale-90"
                        aria-label="Cancel close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startClose(trade.id, trade.currentPrice)}
                      className="rounded-md border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition-transform hover:bg-gray-800 active:scale-95"
                    >
                      Close Trade
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="hidden overflow-x-auto surface md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Current Price</th>
              <th className="px-4 py-3">Unrealized P&L</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  No open positions.
                </td>
              </tr>
            )}
            {positions.map((trade, i) => {
              const pnl = tradePnl(trade)
              const isClosing = closingId === trade.id
              return (
                <tr
                  key={trade.id}
                  className="animate-fade-in-up border-b border-white/5 align-top transition-colors last:border-0 hover:bg-gray-800/30"
                  style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
                >
                  <td className="px-4 py-3 font-medium text-gray-100">{trade.symbol}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'rounded px-1.5 py-0.5 text-xs font-semibold uppercase',
                        trade.direction === 'long'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400',
                      )}
                    >
                      {trade.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-gray-300">{trade.entryPrice}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-gray-300">{trade.quantity}</td>
                  <td className="px-4 py-3">
                    {isXauSymbol(trade.symbol) ? (
                      <div className="flex w-fit items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1">
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                        </span>
                        <span className="font-mono tabular-nums text-gray-100">
                          {trade.currentPrice != null ? trade.currentPrice : 'waiting...'}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                          live
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="any"
                          placeholder={trade.currentPrice != null ? String(trade.currentPrice) : 'price'}
                          value={priceDrafts[trade.id] ?? ''}
                          onChange={(e) => handlePriceInput(trade.id, e.target.value)}
                          className="w-24 rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-gray-100 outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() => applyPrice(trade)}
                          className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-300 transition-transform hover:bg-gray-800 active:scale-95"
                        >
                          Set
                        </button>
                      </div>
                    )}
                  </td>
                  <td
                    className={clsx(
                      'px-4 py-3 font-mono tabular-nums font-medium',
                      trade.currentPrice == null
                        ? 'text-gray-500'
                        : pnl > 0
                          ? 'text-profit'
                          : pnl < 0
                            ? 'text-loss'
                            : 'text-gray-300',
                    )}
                  >
                    {trade.currentPrice != null ? formatSignedCurrency(pnl, currency) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {isClosing ? (
                      <div className="flex animate-slide-down items-center gap-1.5">
                        <input
                          type="number"
                          step="any"
                          placeholder="exit price"
                          value={closePrice}
                          onChange={(e) => setClosePrice(e.target.value)}
                          className="w-24 rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-gray-100 outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() => confirmClose(trade)}
                          className="rounded-md bg-emerald-600 p-1.5 text-white transition-transform hover:bg-emerald-500 active:scale-90"
                          aria-label="Confirm close"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setClosingId(null)}
                          className="rounded-md border border-gray-700 p-1.5 text-gray-300 transition-transform hover:bg-gray-800 active:scale-90"
                          aria-label="Cancel close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startClose(trade.id, trade.currentPrice)}
                        className="rounded-md border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition-transform hover:bg-gray-800 active:scale-95"
                      >
                        Close Trade
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
