import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Clock, LogIn, LogOut } from 'lucide-react'
import { Trade, NewTradeInput, Direction } from '../lib/types'
import { tradePnl, tradeRMultiple } from '../lib/calculations'
import { formatSignedCurrency, formatRMultiple } from '../lib/format'
import { useAccountStore } from '../store/useAccountStore'
import { isXauSymbol, XAU_POINT_VALUE } from '../lib/instruments'

interface TradeFormProps {
  initial?: Trade
  existingTags?: string[]
  onSubmit: (input: NewTradeInput) => void
  onCancel: () => void
}

type FormErrors = Partial<Record<'symbol' | 'quantity' | 'entryPrice' | 'entryDate', string>>

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function isoToDatePart(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isoToTimePart(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function partsToIso(date: string, time: string): string | null {
  if (!date) return null
  return new Date(`${date}T${time || '00:00'}`).toISOString()
}

function nowParts() {
  const d = new Date()
  return { date: isoToDatePart(d.toISOString()), time: isoToTimePart(d.toISOString()) }
}

type PickerInput = HTMLInputElement & { showPicker?: () => void }

function openPicker(e: { currentTarget: PickerInput }) {
  if (typeof e.currentTarget.showPicker === 'function') {
    try {
      e.currentTarget.showPicker()
    } catch {
      // ignore: some browsers block showPicker outside a direct user gesture
    }
  }
}

const DEFAULT_SYMBOL = 'XAU'

export default function TradeForm({ initial, existingTags = [], onSubmit, onCancel }: TradeFormProps) {
  const currency = useAccountStore((s) => s.currentAccount.currency)
  const symbolInputRef = useRef<HTMLInputElement>(null)

  const [symbol, setSymbol] = useState(initial?.symbol ?? DEFAULT_SYMBOL)
  const [direction, setDirection] = useState<Direction>(initial?.direction ?? 'long')
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : '1')
  const [entryPrice, setEntryPrice] = useState(initial ? String(initial.entryPrice) : '')

  const initialEntry = initial ? { date: isoToDatePart(initial.entryDate), time: isoToTimePart(initial.entryDate) } : nowParts()
  const [entryDateStr, setEntryDateStr] = useState(initialEntry.date)
  const [entryTimeStr, setEntryTimeStr] = useState(initialEntry.time)

  const [exitPrice, setExitPrice] = useState(initial?.exitPrice != null ? String(initial.exitPrice) : '')
  const [exitDateStr, setExitDateStr] = useState(initial ? isoToDatePart(initial.exitDate) : '')
  const [exitTimeStr, setExitTimeStr] = useState(initial ? isoToTimePart(initial.exitDate) : '')

  const [stopLoss, setStopLoss] = useState(initial?.stopLoss != null ? String(initial.stopLoss) : '')
  const [pointValue, setPointValue] = useState(
    initial ? String(initial.pointValue) : String(isXauSymbol(symbol) ? XAU_POINT_VALUE : 1),
  )
  const pointValueTouchedRef = useRef(false)
  const [fees, setFees] = useState(initial ? String(initial.fees) : '0')
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [errors, setErrors] = useState<FormErrors>({})

  const activeTags = useMemo(
    () =>
      new Set(
        tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    [tags],
  )
  const tagSuggestions = existingTags.filter((t) => !activeTags.has(t.toLowerCase()))

  useEffect(() => {
    symbolInputRef.current?.focus()
    symbolInputRef.current?.select()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  // Auto-suggest the point value from the symbol for new trades, until the
  // user explicitly edits it themselves.
  useEffect(() => {
    if (initial || pointValueTouchedRef.current) return
    setPointValue(String(isXauSymbol(symbol) ? XAU_POINT_VALUE : 1))
  }, [symbol, initial])

  function addTagSuggestion(tag: string) {
    const parts = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    setTags([...parts, tag].join(', '))
  }

  function setEntryNow() {
    const { date, time } = nowParts()
    setEntryDateStr(date)
    setEntryTimeStr(time)
    if (errors.entryDate) setErrors((prev) => ({ ...prev, entryDate: undefined }))
  }

  function setExitNow() {
    const { date, time } = nowParts()
    setExitDateStr(date)
    setExitTimeStr(time)
  }

  const preview = useMemo(() => {
    const qty = Number(quantity)
    const entry = Number(entryPrice)
    if (!qty || !entry) return null
    const exit = exitPrice ? Number(exitPrice) : null
    const entryIso = partsToIso(entryDateStr, entryTimeStr) ?? new Date().toISOString()
    const draft: Trade = {
      id: 'preview',
      symbol: symbol || '—',
      direction,
      quantity: qty,
      entryPrice: entry,
      entryDate: entryIso,
      exitPrice: exit,
      exitDate: exit != null ? (partsToIso(exitDateStr || entryDateStr, exitTimeStr || entryTimeStr) ?? entryIso) : null,
      fees: Number(fees) || 0,
      stopLoss: stopLoss ? Number(stopLoss) : null,
      notes: '',
      tags: [],
      currentPrice: null,
      pointValue: Number(pointValue) || 1,
    }
    if (exit == null) return null
    return { pnl: tradePnl(draft), r: tradeRMultiple(draft) }
  }, [
    symbol,
    direction,
    quantity,
    entryPrice,
    entryDateStr,
    entryTimeStr,
    exitPrice,
    exitDateStr,
    exitTimeStr,
    fees,
    stopLoss,
    pointValue,
  ])

  function validate(): FormErrors {
    const next: FormErrors = {}
    if (!symbol.trim()) next.symbol = 'Symbol is required'
    if (!quantity || Number(quantity) <= 0) next.quantity = 'Enter a quantity greater than 0'
    if (!entryPrice || Number(entryPrice) <= 0) next.entryPrice = 'Enter an entry price greater than 0'
    if (!entryDateStr) next.entryDate = 'Entry date is required'
    return next
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const validation = validate()
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    const exit = exitPrice ? Number(exitPrice) : null
    onSubmit({
      symbol: symbol.trim().toUpperCase(),
      direction,
      quantity: Number(quantity),
      entryPrice: Number(entryPrice),
      entryDate: partsToIso(entryDateStr, entryTimeStr)!,
      exitPrice: exit,
      exitDate: exit != null ? partsToIso(exitDateStr || entryDateStr, exitTimeStr || entryTimeStr) : null,
      fees: Number(fees) || 0,
      stopLoss: stopLoss ? Number(stopLoss) : null,
      notes,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      currentPrice: initial?.currentPrice ?? null,
      pointValue: Number(pointValue) || 1,
    })
  }

  function fieldClass(hasError: boolean) {
    return `w-full rounded-lg border bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none ${
      hasError ? 'border-loss focus:border-loss' : 'border-gray-700 focus:border-emerald-500'
    }`
  }
  const labelClass = 'mb-1 block text-xs font-medium text-gray-400'
  const errorClass = 'mt-1 text-xs text-loss'

  const sectionClass = 'space-y-4 rounded-lg border border-white/10 bg-black/20 p-4'
  const sectionHeadingClass = 'flex items-center gap-2 text-sm font-semibold text-gray-200'

  return (
    <form onSubmit={handleSubmit} className="space-y-5 surface p-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={sectionClass}>
          <div className={sectionHeadingClass}>
            <LogIn className="h-4 w-4 text-emerald-500" />
            Entry
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Symbol</label>
              <input
                ref={symbolInputRef}
                className={fieldClass(!!errors.symbol)}
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value.toUpperCase())
                  if (errors.symbol) setErrors((prev) => ({ ...prev, symbol: undefined }))
                }}
                placeholder={DEFAULT_SYMBOL}
              />
              {errors.symbol && <p className={errorClass}>{errors.symbol}</p>}
            </div>
            <div>
              <label className={labelClass}>Direction</label>
              <select
                className={fieldClass(false)}
                value={direction}
                onChange={(e) => setDirection(e.target.value as Direction)}
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Quantity</label>
              <input
                className={fieldClass(!!errors.quantity)}
                type="number"
                step="any"
                placeholder="e.g. 1"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value)
                  if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: undefined }))
                }}
              />
              {errors.quantity && <p className={errorClass}>{errors.quantity}</p>}
            </div>
            <div>
              <label className={labelClass}>Entry Price</label>
              <input
                className={fieldClass(!!errors.entryPrice)}
                type="number"
                step="any"
                placeholder="0.00"
                value={entryPrice}
                onChange={(e) => {
                  setEntryPrice(e.target.value)
                  if (errors.entryPrice) setErrors((prev) => ({ ...prev, entryPrice: undefined }))
                }}
              />
              {errors.entryPrice && <p className={errorClass}>{errors.entryPrice}</p>}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className={labelClass}>Entry Date / Time</label>
              <button
                type="button"
                onClick={setEntryNow}
                className="mb-1 flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400"
              >
                <Clock className="h-3 w-3" />
                Now
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={fieldClass(!!errors.entryDate)}
                type="date"
                value={entryDateStr}
                onClick={openPicker}
                onFocus={openPicker}
                onChange={(e) => {
                  setEntryDateStr(e.target.value)
                  if (errors.entryDate) setErrors((prev) => ({ ...prev, entryDate: undefined }))
                }}
              />
              <input
                className={fieldClass(false)}
                type="time"
                value={entryTimeStr}
                onClick={openPicker}
                onFocus={openPicker}
                onChange={(e) => setEntryTimeStr(e.target.value)}
              />
            </div>
            {errors.entryDate && <p className={errorClass}>{errors.entryDate}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Stop Loss (optional)</label>
              <input
                className={fieldClass(false)}
                type="number"
                step="any"
                placeholder="optional"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Point Value</label>
              <input
                className={fieldClass(false)}
                type="number"
                step="any"
                min={0}
                value={pointValue}
                onChange={(e) => {
                  pointValueTouchedRef.current = true
                  setPointValue(e.target.value)
                }}
              />
              <p className="mt-1 text-xs text-gray-500">$ per point, per unit of quantity. Gold defaults to 10.</p>
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <div className={sectionHeadingClass}>
            <LogOut className="h-4 w-4 text-amber-500" />
            Exit
            <span className="text-xs font-normal text-gray-500">(leave blank to keep the trade open)</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Exit Price</label>
              <input
                className={fieldClass(false)}
                type="number"
                step="any"
                placeholder="optional"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Fees</label>
              <input
                className={fieldClass(false)}
                type="number"
                step="any"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className={labelClass}>Exit Date / Time</label>
              <button
                type="button"
                onClick={setExitNow}
                className="mb-1 flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400"
              >
                <Clock className="h-3 w-3" />
                Now
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={fieldClass(false)}
                type="date"
                value={exitDateStr}
                onClick={openPicker}
                onFocus={openPicker}
                onChange={(e) => setExitDateStr(e.target.value)}
              />
              <input
                className={fieldClass(false)}
                type="time"
                value={exitTimeStr}
                onClick={openPicker}
                onFocus={openPicker}
                onChange={(e) => setExitTimeStr(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Tags</label>
        <input
          className={fieldClass(false)}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="breakout, mean reversion"
        />
        {tagSuggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tagSuggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTagSuggestion(tag)}
                className="rounded-full border border-gray-700 px-2 py-0.5 text-xs text-gray-400 hover:border-emerald-500 hover:text-emerald-400"
              >
                + {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          className={fieldClass(false)}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {preview && (
        <div className="flex gap-6 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm">
          <div>
            <span className="text-gray-500">P&L: </span>
            <span className={preview.pnl >= 0 ? 'text-profit' : 'text-loss'}>
              {formatSignedCurrency(preview.pnl, currency)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">R-Multiple: </span>
            <span className={(preview.r ?? 0) >= 0 ? 'text-profit' : 'text-loss'}>
              {formatRMultiple(preview.r)}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          {initial ? 'Save Changes' : 'Log Trade'}
        </button>
      </div>
    </form>
  )
}
