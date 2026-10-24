import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import AnimatedNumber from '../components/AnimatedNumber'
import { useAccountStore } from '../store/useAccountStore'
import { formatCurrency } from '../lib/format'

export default function RiskCalculator() {
  const { currency, startingCapital, riskPerTradePercent } = useAccountStore((s) => s.currentAccount)

  const [accountSize, setAccountSize] = useState(String(startingCapital))
  const [riskPercent, setRiskPercent] = useState(String(riskPerTradePercent))
  const [entryPrice, setEntryPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')

  const result = useMemo(() => {
    const account = Number(accountSize)
    const risk = Number(riskPercent)
    const entry = Number(entryPrice)
    const stop = Number(stopLoss)

    if (!account || !risk || !entry || !stop || entry === stop) return null

    const riskAmount = account * (risk / 100)
    const perUnitRisk = Math.abs(entry - stop)
    const positionSize = riskAmount / perUnitRisk
    const positionValue = positionSize * entry

    return { riskAmount, perUnitRisk, positionSize, positionValue }
  }, [accountSize, riskPercent, entryPrice, stopLoss])

  const inputClass =
    'w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-emerald-500'
  const labelClass = 'mb-1 block text-xs font-medium text-gray-400'

  return (
    <div>
      <PageHeader
        title="Risk Calculator"
        description="Size your position based on account risk and stop distance."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="animate-fade-in-up space-y-4 surface p-5">
          <div>
            <label className={labelClass}>Account Size</label>
            <input
              className={inputClass}
              type="number"
              step="any"
              value={accountSize}
              onChange={(e) => setAccountSize(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Risk per Trade (%)</label>
            <input
              className={inputClass}
              type="number"
              step="any"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Entry Price</label>
            <input
              className={inputClass}
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Stop Loss Price</label>
            <input
              className={inputClass}
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <StatCard
            label="Max Risk Amount"
            value={
              result ? (
                <AnimatedNumber value={result.riskAmount} format={(v) => formatCurrency(v, currency)} duration={300} />
              ) : (
                '—'
              )
            }
            sub="Capital you're willing to lose on this trade"
            delay={0}
          />
          <StatCard
            label="Position Size"
            value={
              result ? (
                <AnimatedNumber value={result.positionSize} format={(v) => `${v.toFixed(2)} units`} duration={300} />
              ) : (
                '—'
              )
            }
            sub="Quantity to buy or sell"
            delay={60}
          />
          <StatCard
            label="Position Value"
            value={
              result ? (
                <AnimatedNumber
                  value={result.positionValue}
                  format={(v) => formatCurrency(v, currency)}
                  duration={300}
                />
              ) : (
                '—'
              )
            }
            sub="Total notional exposure"
            delay={120}
          />
        </div>
      </div>
    </div>
  )
}
