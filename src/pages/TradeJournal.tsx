import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, ArrowUp, ArrowDown } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import TradeForm from '../components/TradeForm'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { useTradeStore } from '../store/useTradeStore'
import { useAccountStore } from '../store/useAccountStore'
import { Trade } from '../lib/types'
import { tradePnl, tradeRMultiple, tradeStatus, allTags } from '../lib/calculations'
import { formatSignedCurrency, formatCurrency, formatRMultiple } from '../lib/format'
import clsx from 'clsx'

type SortKey = 'symbol' | 'entryDate' | 'pnl' | 'r' | 'status'
type SortDir = 'asc' | 'desc'

export default function TradeJournal() {
  const trades = useTradeStore((s) => s.trades)
  const addTrade = useTradeStore((s) => s.addTrade)
  const updateTrade = useTradeStore((s) => s.updateTrade)
  const deleteTrade = useTradeStore((s) => s.deleteTrade)
  const currency = useAccountStore((s) => s.currentAccount.currency)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Trade | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const { toast, showResult } = useToast()
  const [sortKey, setSortKey] = useState<SortKey>('entryDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const existingTags = useMemo(() => allTags(trades), [trades])

  const rows = useMemo(() => {
    const data = trades.map((t) => ({
      trade: t,
      pnl: tradePnl(t),
      r: tradeRMultiple(t),
      status: tradeStatus(t),
    }))
    data.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'symbol':
          cmp = a.trade.symbol.localeCompare(b.trade.symbol)
          break
        case 'entryDate':
          cmp = new Date(a.trade.entryDate).getTime() - new Date(b.trade.entryDate).getTime()
          break
        case 'pnl':
          cmp = a.pnl - b.pnl
          break
        case 'r':
          cmp = (a.r ?? 0) - (b.r ?? 0)
          break
        case 'status':
          cmp = a.status.localeCompare(b.status)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return data
  }, [trades, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function openNew() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(trade: Trade) {
    setEditing(trade)
    setShowForm(true)
  }

  async function handleSubmit(input: Parameters<typeof addTrade>[0]) {
    const errorMessage = editing ? await updateTrade(editing.id, input) : await addTrade(input)
    showResult(errorMessage, editing ? `${input.symbol} trade updated` : `${input.symbol} trade logged`)
    setShowForm(false)
    setEditing(null)
  }

  async function confirmDelete(trade: Trade) {
    const errorMessage = await deleteTrade(trade.id)
    setConfirmingDeleteId(null)
    showResult(errorMessage, `${trade.symbol} trade deleted`)
  }

  function SortHeader({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) {
    const active = sortKey === sortKeyValue
    return (
      <th
        className="cursor-pointer select-none px-4 py-3 hover:text-gray-300"
        onClick={() => toggleSort(sortKeyValue)}
      >
        <span className="flex items-center gap-1">
          {label}
          {active && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
        </span>
      </th>
    )
  }

  return (
    <div>
      <PageHeader
        title="Trade Journal"
        description="Log every trade. P&L and R-multiple are calculated automatically."
        actions={
          !showForm && (
            <button
              onClick={openNew}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-transform hover:bg-emerald-500 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Log Trade
            </button>
          )
        }
      />

      <Toast toast={toast} />

      {showForm && (
        <div className="mb-6 animate-slide-down">
          <TradeForm
            initial={editing ?? undefined}
            existingTags={existingTags}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false)
              setEditing(null)
            }}
          />
        </div>
      )}

      {rows.length === 0 ? (
        <div className="surface px-4 py-10 text-center text-gray-500 md:hidden">
          No trades logged yet.
        </div>
      ) : (
        <div className="space-y-3 md:hidden">
          {rows.map(({ trade, pnl, r, status }, i) => {
            const isConfirmingDelete = confirmingDeleteId === trade.id
            return (
              <div
                key={trade.id}
                className="animate-fade-in-up surface p-4"
                style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
              >
                <div className="flex items-start justify-between">
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
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-xs',
                      status === 'open'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-gray-700/50 text-gray-300',
                    )}
                  >
                    {status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500">Entry</div>
                    <div className="font-mono tabular-nums text-gray-200">
                      {formatCurrency(trade.entryPrice, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Exit</div>
                    <div className="font-mono tabular-nums text-gray-200">
                      {trade.exitPrice != null ? formatCurrency(trade.exitPrice, currency) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Qty</div>
                    <div className="font-mono tabular-nums text-gray-200">{trade.quantity}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
                  <div>
                    <div className="text-xs text-gray-500">P&L</div>
                    <div
                      className={clsx(
                        'font-mono text-lg font-semibold tabular-nums',
                        pnl > 0 && 'text-profit',
                        pnl < 0 && 'text-loss',
                      )}
                    >
                      {status === 'closed' || trade.currentPrice != null
                        ? formatSignedCurrency(pnl, currency)
                        : '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">R-Multiple</div>
                    <div className="font-mono tabular-nums text-gray-300">{formatRMultiple(r)}</div>
                  </div>
                </div>

                {trade.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {trade.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex justify-end gap-2 border-t border-white/10 pt-3">
                  {isConfirmingDelete ? (
                    <>
                      <span className="mr-auto self-center text-xs text-gray-500">Delete this trade?</span>
                      <button
                        onClick={() => confirmDelete(trade)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-loss hover:bg-gray-800 active:scale-95"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-800 active:scale-95"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => openEdit(trade)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 transition-transform hover:bg-gray-800 hover:text-gray-100 active:scale-95"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(trade.id)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 transition-transform hover:bg-gray-800 hover:text-loss active:scale-95"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </>
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
              <SortHeader label="Symbol" sortKeyValue="symbol" />
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">Exit</th>
              <th className="px-4 py-3">Qty</th>
              <SortHeader label="Status" sortKeyValue="status" />
              <SortHeader label="P&L" sortKeyValue="pnl" />
              <SortHeader label="R" sortKeyValue="r" />
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                  No trades logged yet.
                </td>
              </tr>
            )}
            {rows.map(({ trade, pnl, r, status }, i) => {
              const isConfirmingDelete = confirmingDeleteId === trade.id
              return (
                <tr
                  key={trade.id}
                  className="animate-fade-in-up border-b border-white/5 transition-colors last:border-0 hover:bg-gray-800/30"
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
                  <td className="px-4 py-3 font-mono tabular-nums text-gray-300">
                    {formatCurrency(trade.entryPrice, currency)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-gray-300">
                    {trade.exitPrice != null ? formatCurrency(trade.exitPrice, currency) : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-gray-300">{trade.quantity}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5 text-xs',
                        status === 'open'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-gray-700/50 text-gray-300',
                      )}
                    >
                      {status}
                    </span>
                  </td>
                  <td
                    className={clsx(
                      'px-4 py-3 font-mono tabular-nums font-medium',
                      pnl > 0 && 'text-profit',
                      pnl < 0 && 'text-loss',
                    )}
                  >
                    {status === 'closed' || trade.currentPrice != null
                      ? formatSignedCurrency(pnl, currency)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-gray-400">{formatRMultiple(r)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {trade.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isConfirmingDelete ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-500">Delete?</span>
                        <button
                          onClick={() => confirmDelete(trade)}
                          className="rounded p-1.5 text-loss hover:bg-gray-800"
                          aria-label="Confirm delete"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(null)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-800"
                          aria-label="Cancel delete"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(trade)}
                          className="rounded p-1.5 text-gray-400 transition-transform hover:bg-gray-800 hover:text-gray-100 active:scale-90"
                          aria-label="Edit trade"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(trade.id)}
                          className="rounded p-1.5 text-gray-400 transition-transform hover:bg-gray-800 hover:text-loss active:scale-90"
                          aria-label="Delete trade"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
