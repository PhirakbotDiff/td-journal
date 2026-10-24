export type Direction = 'long' | 'short'

export interface Trade {
  id: string
  symbol: string
  direction: Direction
  entryPrice: number
  exitPrice: number | null
  quantity: number
  entryDate: string // ISO datetime
  exitDate: string | null // ISO datetime, null while open
  fees: number
  notes: string
  tags: string[]
  stopLoss: number | null
  currentPrice: number | null // manual mark for open positions
  pointValue: number // $ per point, per unit of quantity (e.g. 10 for a gold mini lot)
}

export type TradeStatus = 'open' | 'closed'

export type AccountKind = 'cent' | 'fund'

export interface Account {
  id: string
  name: string
  kind: AccountKind
  currency: string
  startingCapital: number
  riskPerTradePercent: number
}

export type NewAccountInput = Omit<Account, 'id'>

export type NewTradeInput = Omit<Trade, 'id'>
