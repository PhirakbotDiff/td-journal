import { describe, it, expect, afterEach, vi } from 'vitest'
import { Trade } from './types'
import {
  tradeStatus,
  tradePnl,
  tradeInitialRisk,
  tradeRMultiple,
  closedTrades,
  openTrades,
  winRate,
  totalPnl,
  todayPnl,
  equityCurve,
  avgWin,
  avgLoss,
  bestTrade,
  worstTrade,
  pnlBySymbol,
  pnlByMonth,
  allTags,
} from './calculations'

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
    symbol: 'XAU',
    direction: 'long',
    entryPrice: 100,
    exitPrice: null,
    quantity: 1,
    entryDate: '2024-01-01T00:00:00.000Z',
    exitDate: null,
    fees: 0,
    notes: '',
    tags: [],
    stopLoss: null,
    currentPrice: null,
    pointValue: 1,
    ...overrides,
  }
}

describe('tradeStatus', () => {
  it('is open when exitPrice and exitDate are null', () => {
    expect(tradeStatus(makeTrade())).toBe('open')
  })

  it('is open when only exitPrice is set', () => {
    expect(tradeStatus(makeTrade({ exitPrice: 110 }))).toBe('open')
  })

  it('is closed when both exitPrice and exitDate are set', () => {
    expect(tradeStatus(makeTrade({ exitPrice: 110, exitDate: '2024-01-02T00:00:00.000Z' }))).toBe(
      'closed',
    )
  })
})

describe('tradePnl', () => {
  it('computes a winning long trade', () => {
    const trade = makeTrade({
      direction: 'long',
      entryPrice: 100,
      exitPrice: 110,
      exitDate: '2024-01-02T00:00:00.000Z',
      quantity: 2,
      fees: 1,
    })
    expect(tradePnl(trade)).toBe(19) // (110-100)*2 - 1
  })

  it('computes a losing long trade', () => {
    const trade = makeTrade({
      direction: 'long',
      entryPrice: 100,
      exitPrice: 90,
      exitDate: '2024-01-02T00:00:00.000Z',
      quantity: 2,
      fees: 1,
    })
    expect(tradePnl(trade)).toBe(-21) // (90-100)*2 - 1
  })

  it('computes a winning short trade', () => {
    const trade = makeTrade({
      direction: 'short',
      entryPrice: 100,
      exitPrice: 90,
      exitDate: '2024-01-02T00:00:00.000Z',
      quantity: 2,
      fees: 1,
    })
    expect(tradePnl(trade)).toBe(19) // (100-90)*2 - 1
  })

  it('computes a losing short trade', () => {
    const trade = makeTrade({
      direction: 'short',
      entryPrice: 100,
      exitPrice: 110,
      exitDate: '2024-01-02T00:00:00.000Z',
      quantity: 2,
      fees: 1,
    })
    expect(tradePnl(trade)).toBe(-21) // (100-110)*2 - 1
  })

  it('uses currentPrice for unrealized P&L on an open trade', () => {
    const trade = makeTrade({ direction: 'long', entryPrice: 100, currentPrice: 115, quantity: 3 })
    expect(tradePnl(trade)).toBe(45) // (115-100)*3
  })

  it('returns 0 for an open trade with no currentPrice marked', () => {
    expect(tradePnl(makeTrade())).toBe(0)
  })

  it('scales P&L by pointValue (e.g. a gold mini lot at $10/point)', () => {
    const trade = makeTrade({
      direction: 'short',
      entryPrice: 4153,
      exitPrice: 4118,
      exitDate: '2024-01-02T00:00:00.000Z',
      quantity: 2,
      fees: 0,
      pointValue: 10,
    })
    expect(tradePnl(trade)).toBe(700) // (4153-4118)*2*10
  })
})

describe('tradeInitialRisk', () => {
  it('returns null when there is no stop loss', () => {
    expect(tradeInitialRisk(makeTrade())).toBeNull()
  })

  it('computes risk for a long trade with a stop below entry', () => {
    const trade = makeTrade({ direction: 'long', entryPrice: 100, stopLoss: 95, quantity: 2 })
    expect(tradeInitialRisk(trade)).toBe(10) // (100-95)*2
  })

  it('returns null for a long trade with an invalid stop above entry', () => {
    const trade = makeTrade({ direction: 'long', entryPrice: 100, stopLoss: 105, quantity: 2 })
    expect(tradeInitialRisk(trade)).toBeNull()
  })

  it('computes risk for a short trade with a stop above entry', () => {
    const trade = makeTrade({ direction: 'short', entryPrice: 100, stopLoss: 105, quantity: 2 })
    expect(tradeInitialRisk(trade)).toBe(10) // (105-100)*2
  })

  it('returns null for a short trade with an invalid stop below entry', () => {
    const trade = makeTrade({ direction: 'short', entryPrice: 100, stopLoss: 95, quantity: 2 })
    expect(tradeInitialRisk(trade)).toBeNull()
  })

  it('returns null when the stop equals the entry price', () => {
    const trade = makeTrade({ direction: 'long', entryPrice: 100, stopLoss: 100, quantity: 2 })
    expect(tradeInitialRisk(trade)).toBeNull()
  })

  it('scales risk by pointValue', () => {
    const trade = makeTrade({ direction: 'long', entryPrice: 100, stopLoss: 95, quantity: 2, pointValue: 10 })
    expect(tradeInitialRisk(trade)).toBe(100) // (100-95)*2*10
  })
})

describe('tradeRMultiple', () => {
  it('returns null when risk is unknown', () => {
    const trade = makeTrade({ exitPrice: 110, exitDate: '2024-01-02T00:00:00.000Z' })
    expect(tradeRMultiple(trade)).toBeNull()
  })

  it('expresses a win as a positive multiple of risk', () => {
    const trade = makeTrade({
      direction: 'long',
      entryPrice: 100,
      exitPrice: 110,
      exitDate: '2024-01-02T00:00:00.000Z',
      quantity: 2,
      fees: 1,
      stopLoss: 95,
    })
    // pnl = 19, risk = (100-95)*2 = 10
    expect(tradeRMultiple(trade)).toBeCloseTo(1.9)
  })

  it('expresses a loss as a negative multiple of risk', () => {
    const trade = makeTrade({
      direction: 'long',
      entryPrice: 100,
      exitPrice: 90,
      exitDate: '2024-01-02T00:00:00.000Z',
      quantity: 2,
      fees: 1,
      stopLoss: 95,
    })
    // pnl = -21, risk = 10
    expect(tradeRMultiple(trade)).toBeCloseTo(-2.1)
  })
})

describe('closedTrades / openTrades', () => {
  const trades = [
    makeTrade({ id: 'open-1' }),
    makeTrade({ id: 'closed-1', exitPrice: 110, exitDate: '2024-01-02T00:00:00.000Z' }),
    makeTrade({ id: 'open-2', currentPrice: 105 }),
    makeTrade({ id: 'closed-2', exitPrice: 90, exitDate: '2024-01-03T00:00:00.000Z' }),
  ]

  it('filters only closed trades', () => {
    expect(closedTrades(trades).map((t) => t.id)).toEqual(['closed-1', 'closed-2'])
  })

  it('filters only open trades', () => {
    expect(openTrades(trades).map((t) => t.id)).toEqual(['open-1', 'open-2'])
  })
})

describe('winRate', () => {
  it('is 0 with no trades', () => {
    expect(winRate([])).toBe(0)
  })

  it('is 0 when there are no closed trades', () => {
    expect(winRate([makeTrade()])).toBe(0)
  })

  it('computes the percentage of winning closed trades', () => {
    const trades = [
      makeTrade({ id: '1', exitPrice: 110, exitDate: '2024-01-02T00:00:00.000Z' }), // win
      makeTrade({ id: '2', exitPrice: 90, exitDate: '2024-01-02T00:00:00.000Z' }), // loss
      makeTrade({ id: '3', exitPrice: 120, exitDate: '2024-01-03T00:00:00.000Z' }), // win
      makeTrade({ id: '4' }), // open, excluded
    ]
    expect(winRate(trades)).toBeCloseTo(66.666, 2)
  })
})

describe('totalPnl', () => {
  it('sums realized and unrealized P&L across all trades', () => {
    const trades = [
      makeTrade({ entryPrice: 100, exitPrice: 110, exitDate: '2024-01-02T00:00:00.000Z' }), // +10
      makeTrade({ entryPrice: 100, currentPrice: 95 }), // -5 unrealized
      makeTrade({}), // 0, no mark
    ]
    expect(totalPnl(trades)).toBe(5)
  })

  it('is 0 for an empty list', () => {
    expect(totalPnl([])).toBe(0)
  })
})

describe('todayPnl', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('only sums trades closed on the current day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T18:00:00.000Z'))

    const trades = [
      makeTrade({
        entryPrice: 100,
        exitPrice: 110,
        exitDate: '2024-06-15T09:00:00.000Z',
      }), // today, +10
      makeTrade({
        entryPrice: 100,
        exitPrice: 130,
        exitDate: '2024-06-14T09:00:00.000Z',
      }), // yesterday, excluded
      makeTrade({ currentPrice: 150 }), // still open, excluded
    ]

    expect(todayPnl(trades)).toBe(10)
  })
})

describe('equityCurve', () => {
  it('starts at the starting capital with no closed trades', () => {
    const curve = equityCurve([], 10000)
    expect(curve).toEqual([{ date: 'Start', equity: 10000 }])
  })

  it('accumulates equity in exit-date order regardless of input order', () => {
    const trades = [
      makeTrade({
        entryPrice: 100,
        exitPrice: 90,
        exitDate: '2024-01-10T00:00:00.000Z',
      }), // -10, later
      makeTrade({
        entryPrice: 100,
        exitPrice: 120,
        exitDate: '2024-01-01T00:00:00.000Z',
      }), // +20, earlier
    ]
    const curve = equityCurve(trades, 1000)
    expect(curve.map((p) => p.equity)).toEqual([1000, 1020, 1010])
  })
})

describe('avgWin / avgLoss', () => {
  const trades = [
    makeTrade({ id: '1', entryPrice: 100, exitPrice: 110, exitDate: '2024-01-02T00:00:00.000Z' }), // +10
    makeTrade({ id: '2', entryPrice: 100, exitPrice: 120, exitDate: '2024-01-02T00:00:00.000Z' }), // +20
    makeTrade({ id: '3', entryPrice: 100, exitPrice: 80, exitDate: '2024-01-02T00:00:00.000Z' }), // -20
  ]

  it('averages only winning trades', () => {
    expect(avgWin(trades)).toBe(15)
  })

  it('averages only losing trades', () => {
    expect(avgLoss(trades)).toBe(-20)
  })

  it('returns 0 when there are no wins or losses', () => {
    expect(avgWin([])).toBe(0)
    expect(avgLoss([])).toBe(0)
  })
})

describe('bestTrade / worstTrade', () => {
  it('returns null when there are no closed trades', () => {
    expect(bestTrade([])).toBeNull()
    expect(worstTrade([])).toBeNull()
  })

  it('picks the highest and lowest P&L among closed trades', () => {
    const trades = [
      makeTrade({ id: 'mid', entryPrice: 100, exitPrice: 105, exitDate: '2024-01-02T00:00:00.000Z' }),
      makeTrade({ id: 'best', entryPrice: 100, exitPrice: 150, exitDate: '2024-01-02T00:00:00.000Z' }),
      makeTrade({ id: 'worst', entryPrice: 100, exitPrice: 50, exitDate: '2024-01-02T00:00:00.000Z' }),
    ]
    expect(bestTrade(trades)?.id).toBe('best')
    expect(worstTrade(trades)?.id).toBe('worst')
  })
})

describe('pnlBySymbol', () => {
  it('aggregates P&L per symbol and sorts descending', () => {
    const trades = [
      makeTrade({ symbol: 'XAU', entryPrice: 100, exitPrice: 110, exitDate: '2024-01-02T00:00:00.000Z' }),
      makeTrade({ symbol: 'XAU', entryPrice: 100, exitPrice: 95, exitDate: '2024-01-03T00:00:00.000Z' }),
      makeTrade({ symbol: 'EUR', entryPrice: 100, exitPrice: 130, exitDate: '2024-01-04T00:00:00.000Z' }),
    ]
    const result = pnlBySymbol(trades)
    expect(result).toEqual([
      { symbol: 'EUR', pnl: 30, count: 1 },
      { symbol: 'XAU', pnl: 5, count: 2 },
    ])
  })
})

describe('pnlByMonth', () => {
  it('buckets P&L by year and month, sorted chronologically', () => {
    const trades = [
      makeTrade({ entryPrice: 100, exitPrice: 110, exitDate: '2024-03-05T00:00:00.000Z' }),
      makeTrade({ entryPrice: 100, exitPrice: 90, exitDate: '2024-01-15T00:00:00.000Z' }),
      makeTrade({ entryPrice: 100, exitPrice: 120, exitDate: '2024-01-20T00:00:00.000Z' }),
    ]
    const result = pnlByMonth(trades)
    expect(result).toEqual([
      { year: 2024, month: 0, pnl: 10 }, // Jan: -10 + 20
      { year: 2024, month: 2, pnl: 10 }, // Mar: +10
    ])
  })
})

describe('allTags', () => {
  it('dedupes and sorts tags across trades', () => {
    const trades = [
      makeTrade({ tags: ['breakout', 'news'] }),
      makeTrade({ tags: ['breakout', 'mean reversion'] }),
      makeTrade({ tags: [] }),
    ]
    expect(allTags(trades)).toEqual(['breakout', 'mean reversion', 'news'])
  })

  it('returns an empty array when no trades have tags', () => {
    expect(allTags([makeTrade()])).toEqual([])
  })
})
