import { Trade } from './types'

const COLUMNS: (keyof Trade)[] = [
  'id',
  'symbol',
  'direction',
  'entryPrice',
  'exitPrice',
  'quantity',
  'entryDate',
  'exitDate',
  'fees',
  'notes',
  'tags',
  'stopLoss',
  'currentPrice',
  'pointValue',
]

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function tradesToCsv(trades: Trade[]): string {
  const header = COLUMNS.join(',')
  const rows = trades.map((t) =>
    COLUMNS.map((col) => {
      const value = t[col]
      if (value == null) return ''
      if (Array.isArray(value)) return csvEscape(value.join('|'))
      return csvEscape(String(value))
    }).join(','),
  )
  return [header, ...rows].join('\n')
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export function csvToTrades(csv: string): Trade[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const header = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row: Record<string, string> = {}
    header.forEach((col, i) => {
      row[col] = values[i] ?? ''
    })
    return {
      id: row.id || crypto.randomUUID(),
      symbol: row.symbol,
      direction: row.direction === 'short' ? 'short' : 'long',
      entryPrice: Number(row.entryPrice) || 0,
      exitPrice: row.exitPrice ? Number(row.exitPrice) : null,
      quantity: Number(row.quantity) || 0,
      entryDate: row.entryDate,
      exitDate: row.exitDate || null,
      fees: Number(row.fees) || 0,
      notes: row.notes ?? '',
      tags: row.tags ? row.tags.split('|').filter(Boolean) : [],
      stopLoss: row.stopLoss ? Number(row.stopLoss) : null,
      currentPrice: row.currentPrice ? Number(row.currentPrice) : null,
      pointValue: row.pointValue ? Number(row.pointValue) : 1,
    }
  })
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
