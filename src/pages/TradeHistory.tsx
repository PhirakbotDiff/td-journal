import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Download, Upload } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useTradeStore } from '../store/useTradeStore'
import { useAccountStore } from '../store/useAccountStore'
import { closedTrades, tradePnl, tradeRMultiple } from '../lib/calculations'
import { formatSignedCurrency, formatRMultiple } from '../lib/format'
import { tradesToCsv, csvToTrades, downloadCsv } from '../lib/csv'
import clsx from 'clsx'

type SortKey = 'symbol' | 'entryDate' | 'exitDate' | 'pnl' | 'r'
type SortDir = 'asc' | 'desc'

export default function TradeHistory() {
  const trades = useTradeStore((s) => s.trades)
  const importTrades = useTradeStore((s) => s.importTrades)
  const currency = useAccountStore((s) => s.currentAccount.currency)

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('exitDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const rows = useMemo(() => {
    let data = closedTrades(trades).map((t) => ({
      trade: t,
      pnl: tradePnl(t),
      r: tradeRMultiple(t),
    }))

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      data = data.filter((row) => row.trade.symbol.toLowerCase().includes(q))
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime()
      data = data.filter((row) => new Date(row.trade.exitDate!).getTime() >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1
      data = data.filter((row) => new Date(row.trade.exitDate!).getTime() <= to)
    }

    data.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'symbol':
          cmp = a.trade.symbol.localeCompare(b.trade.symbol)
          break
        case 'entryDate':
          cmp = new Date(a.trade.entryDate).getTime() - new Date(b.trade.entryDate).getTime()
          break
        case 'exitDate':
          cmp = new Date(a.trade.exitDate!).getTime() - new Date(b.trade.exitDate!).getTime()
          break
        case 'pnl':
          cmp = a.pnl - b.pnl
          break
        case 'r':
          cmp = (a.r ?? 0) - (b.r ?? 0)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return data
  }, [trades, search, dateFrom, dateTo, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function handleExport() {
    const csv = tradesToCsv(closedTrades(trades))
    downloadCsv(`trade-history-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const text = String(reader.result ?? '')
      const imported = csvToTrades(text)
      if (imported.length) await importTrades(imported)
    }
    reader.readAsText(file)
    e.target.value = ''
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
        title="Trade History"
        description="Closed trades. Filter, sort, and export your history."
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-transform hover:bg-gray-800 active:scale-95"
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-transform hover:bg-gray-800 active:scale-95"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          placeholder="Search symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-emerald-500"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-emerald-500"
        />
        <span className="text-gray-600">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-emerald-500"
        />
      </div>

      {rows.length === 0 ? (
        <div className="surface px-4 py-10 text-center text-gray-500 md:hidden">
          No closed trades match these filters.
        </div>
      ) : (
        <div className="space-y-3 md:hidden">
          {rows.map(({ trade, pnl, r }, i) => (
            <div
              key={trade.id}
              className="animate-fade-in-up surface p-4"
              style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
            >
              <div className="flex items-center justify-between">
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
                <div
                  className={clsx(
                    'font-mono text-base font-semibold tabular-nums',
                    pnl > 0 && 'text-profit',
                    pnl < 0 && 'text-loss',
                  )}
                >
                  {formatSignedCurrency(pnl, currency)}
                </div>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                {new Date(trade.entryDate).toLocaleDateString()} → {new Date(trade.exitDate!).toLocaleDateString()}
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                <div>
                  <div className="text-gray-500">Entry</div>
                  <div className="font-mono tabular-nums text-gray-200">{trade.entryPrice}</div>
                </div>
                <div>
                  <div className="text-gray-500">Exit</div>
                  <div className="font-mono tabular-nums text-gray-200">{trade.exitPrice}</div>
                </div>
                <div>
                  <div className="text-gray-500">Qty</div>
                  <div className="font-mono tabular-nums text-gray-200">{trade.quantity}</div>
                </div>
                <div>
                  <div className="text-gray-500">R</div>
                  <div className="font-mono tabular-nums text-gray-200">{formatRMultiple(r)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="hidden overflow-x-auto surface md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
              <SortHeader label="Symbol" sortKeyValue="symbol" />
              <th className="px-4 py-3">Side</th>
              <SortHeader label="Entry Date" sortKeyValue="entryDate" />
              <SortHeader label="Exit Date" sortKeyValue="exitDate" />
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">Exit</th>
              <th className="px-4 py-3">Qty</th>
              <SortHeader label="P&L" sortKeyValue="pnl" />
              <SortHeader label="R" sortKeyValue="r" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                  No closed trades match these filters.
                </td>
              </tr>
            )}
            {rows.map(({ trade, pnl, r }, i) => (
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
                <td className="px-4 py-3 text-gray-400">
                  {new Date(trade.entryDate).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(trade.exitDate!).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-gray-300">{trade.entryPrice}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-gray-300">{trade.exitPrice}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-gray-300">{trade.quantity}</td>
                <td
                  className={clsx(
                    'px-4 py-3 font-mono tabular-nums font-medium',
                    pnl > 0 && 'text-profit',
                    pnl < 0 && 'text-loss',
                  )}
                >
                  {formatSignedCurrency(pnl, currency)}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-gray-400">{formatRMultiple(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
