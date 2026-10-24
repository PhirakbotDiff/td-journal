import { MonthlyPnl } from '../lib/calculations'
import { formatSignedCurrency } from '../lib/format'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface MonthlyHeatmapProps {
  data: MonthlyPnl[]
  currency: string
}

export default function MonthlyHeatmap({ data, currency }: MonthlyHeatmapProps) {
  if (data.length === 0) {
    return <div className="py-10 text-center text-sm text-gray-500">No closed trades yet.</div>
  }

  const years = Array.from(new Set(data.map((d) => d.year))).sort()
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.pnl)), 1)
  const lookup = new Map(data.map((d) => [`${d.year}-${d.month}`, d.pnl]))

  function cellStyle(pnl: number | undefined) {
    if (pnl == null) return { backgroundColor: 'rgba(255,255,255,0.03)' }
    const intensity = Math.min(Math.abs(pnl) / maxAbs, 1)
    const color = pnl >= 0 ? `rgba(34,197,94,${0.15 + intensity * 0.65})` : `rgba(239,68,68,${0.15 + intensity * 0.65})`
    return { backgroundColor: color }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="w-14" />
            {MONTH_LABELS.map((m) => (
              <th key={m} className="pb-1 font-medium text-gray-500">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((year) => (
            <tr key={year}>
              <td className="pr-2 font-medium text-gray-400">{year}</td>
              {MONTH_LABELS.map((_, month) => {
                const pnl = lookup.get(`${year}-${month}`)
                return (
                  <td
                    key={month}
                    title={pnl != null ? formatSignedCurrency(pnl, currency) : 'No trades'}
                    style={cellStyle(pnl)}
                    className="h-10 w-14 cursor-default rounded-md text-center align-middle text-[10px] font-medium text-gray-200 ring-1 ring-inset ring-white/5 transition-all duration-150 hover:scale-[1.07] hover:ring-white/20"
                  >
                    {pnl != null ? formatSignedCurrency(pnl, currency).replace(/\.\d+/, '') : ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-gray-500">
        <span>Loss</span>
        <span className="h-2 w-24 rounded-full bg-gradient-to-r from-loss via-gray-800 to-profit" />
        <span>Profit</span>
      </div>
    </div>
  )
}
