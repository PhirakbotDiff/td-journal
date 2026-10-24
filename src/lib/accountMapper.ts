import { Account, AccountKind } from './types'

export interface AccountRow {
  id: string
  name: string
  kind: AccountKind
  currency: string
  starting_capital: number
  risk_per_trade_percent: number
}

export function rowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    currency: row.currency,
    startingCapital: Number(row.starting_capital),
    riskPerTradePercent: Number(row.risk_per_trade_percent),
  }
}

export function accountToRow(account: Partial<Account>, userId?: string): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (userId !== undefined) row.user_id = userId
  if (account.name !== undefined) row.name = account.name
  if (account.kind !== undefined) row.kind = account.kind
  if (account.currency !== undefined) row.currency = account.currency
  if (account.startingCapital !== undefined) row.starting_capital = account.startingCapital
  if (account.riskPerTradePercent !== undefined) row.risk_per_trade_percent = account.riskPerTradePercent
  return row
}
