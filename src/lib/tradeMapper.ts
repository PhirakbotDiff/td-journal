import { Trade, Direction } from './types'

export interface TradeRow {
  id: string
  account_id: string
  symbol: string
  direction: Direction
  entry_price: number
  exit_price: number | null
  quantity: number
  entry_date: string
  exit_date: string | null
  fees: number
  notes: string
  tags: string[]
  stop_loss: number | null
  current_price: number | null
  point_value: number
}

export function rowToTrade(row: TradeRow): Trade {
  return {
    id: row.id,
    symbol: row.symbol,
    direction: row.direction,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price,
    quantity: row.quantity,
    entryDate: row.entry_date,
    exitDate: row.exit_date,
    fees: row.fees,
    notes: row.notes ?? '',
    tags: row.tags ?? [],
    stopLoss: row.stop_loss,
    currentPrice: row.current_price,
    pointValue: Number(row.point_value ?? 1),
  }
}

export function tradeToRow(
  trade: Partial<Trade>,
  userId: string,
  accountId: string,
): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId, account_id: accountId }
  if (trade.symbol !== undefined) row.symbol = trade.symbol
  if (trade.direction !== undefined) row.direction = trade.direction
  if (trade.entryPrice !== undefined) row.entry_price = trade.entryPrice
  if (trade.exitPrice !== undefined) row.exit_price = trade.exitPrice
  if (trade.quantity !== undefined) row.quantity = trade.quantity
  if (trade.entryDate !== undefined) row.entry_date = trade.entryDate
  if (trade.exitDate !== undefined) row.exit_date = trade.exitDate
  if (trade.fees !== undefined) row.fees = trade.fees
  if (trade.notes !== undefined) row.notes = trade.notes
  if (trade.tags !== undefined) row.tags = trade.tags
  if (trade.stopLoss !== undefined) row.stop_loss = trade.stopLoss
  if (trade.currentPrice !== undefined) row.current_price = trade.currentPrice
  if (trade.pointValue !== undefined) row.point_value = trade.pointValue
  return row
}
