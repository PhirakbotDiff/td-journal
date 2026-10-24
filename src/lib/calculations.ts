import { Trade, TradeStatus } from './types'

export function tradeStatus(trade: Trade): TradeStatus {
  return trade.exitPrice != null && trade.exitDate != null ? 'closed' : 'open'
}

/** Realized P&L for closed trades, unrealized P&L (using currentPrice) for open trades. */
export function tradePnl(trade: Trade): number {
  const exit = tradeStatus(trade) === 'closed' ? trade.exitPrice : trade.currentPrice
  if (exit == null) return 0
  const gross =
    trade.direction === 'long'
      ? (exit - trade.entryPrice) * trade.quantity * trade.pointValue
      : (trade.entryPrice - exit) * trade.quantity * trade.pointValue
  return gross - trade.fees
}

/** Initial risk in currency terms, derived from stop loss distance. Null if no stop loss set. */
export function tradeInitialRisk(trade: Trade): number | null {
  if (trade.stopLoss == null) return null
  const distance =
    trade.direction === 'long'
      ? trade.entryPrice - trade.stopLoss
      : trade.stopLoss - trade.entryPrice
  if (distance <= 0) return null
  return distance * trade.quantity * trade.pointValue
}

/** R-multiple: P&L expressed as a multiple of the initial risk. Null if risk is unknown. */
export function tradeRMultiple(trade: Trade): number | null {
  const risk = tradeInitialRisk(trade)
  if (risk == null || risk === 0) return null
  return tradePnl(trade) / risk
}

export function closedTrades(trades: Trade[]): Trade[] {
  return trades.filter((t) => tradeStatus(t) === 'closed')
}

export function openTrades(trades: Trade[]): Trade[] {
  return trades.filter((t) => tradeStatus(t) === 'open')
}

export function winRate(trades: Trade[]): number {
  const closed = closedTrades(trades)
  if (closed.length === 0) return 0
  const wins = closed.filter((t) => tradePnl(t) > 0).length
  return (wins / closed.length) * 100
}

export function totalPnl(trades: Trade[]): number {
  return trades.reduce((sum, t) => sum + tradePnl(t), 0)
}

export function todayPnl(trades: Trade[]): number {
  const today = new Date().toDateString()
  return closedTrades(trades)
    .filter((t) => t.exitDate && new Date(t.exitDate).toDateString() === today)
    .reduce((sum, t) => sum + tradePnl(t), 0)
}

export interface EquityPoint {
  date: string
  equity: number
}

export function equityCurve(trades: Trade[], startingCapital: number): EquityPoint[] {
  const closed = closedTrades(trades)
    .slice()
    .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime())

  let running = startingCapital
  const points: EquityPoint[] = [{ date: 'Start', equity: running }]
  for (const t of closed) {
    running += tradePnl(t)
    points.push({ date: new Date(t.exitDate!).toLocaleDateString(), equity: running })
  }
  return points
}

export function avgWin(trades: Trade[]): number {
  const wins = closedTrades(trades)
    .map(tradePnl)
    .filter((p) => p > 0)
  if (wins.length === 0) return 0
  return wins.reduce((a, b) => a + b, 0) / wins.length
}

export function avgLoss(trades: Trade[]): number {
  const losses = closedTrades(trades)
    .map(tradePnl)
    .filter((p) => p < 0)
  if (losses.length === 0) return 0
  return losses.reduce((a, b) => a + b, 0) / losses.length
}

export function bestTrade(trades: Trade[]): Trade | null {
  const closed = closedTrades(trades)
  if (closed.length === 0) return null
  return closed.reduce((best, t) => (tradePnl(t) > tradePnl(best) ? t : best))
}

export function worstTrade(trades: Trade[]): Trade | null {
  const closed = closedTrades(trades)
  if (closed.length === 0) return null
  return closed.reduce((worst, t) => (tradePnl(t) < tradePnl(worst) ? t : worst))
}

export interface SymbolPnl {
  symbol: string
  pnl: number
  count: number
}

export function pnlBySymbol(trades: Trade[]): SymbolPnl[] {
  const map = new Map<string, SymbolPnl>()
  for (const t of closedTrades(trades)) {
    const entry = map.get(t.symbol) ?? { symbol: t.symbol, pnl: 0, count: 0 }
    entry.pnl += tradePnl(t)
    entry.count += 1
    map.set(t.symbol, entry)
  }
  return Array.from(map.values()).sort((a, b) => b.pnl - a.pnl)
}

export interface MonthlyPnl {
  year: number
  month: number // 0-11
  pnl: number
}

export function pnlByMonth(trades: Trade[]): MonthlyPnl[] {
  const map = new Map<string, MonthlyPnl>()
  for (const t of closedTrades(trades)) {
    const d = new Date(t.exitDate!)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const entry = map.get(key) ?? { year: d.getFullYear(), month: d.getMonth(), pnl: 0 }
    entry.pnl += tradePnl(t)
    map.set(key, entry)
  }
  return Array.from(map.values()).sort((a, b) => a.year - b.year || a.month - b.month)
}

export function allTags(trades: Trade[]): string[] {
  const set = new Set<string>()
  for (const t of trades) for (const tag of t.tags) set.add(tag)
  return Array.from(set).sort()
}
