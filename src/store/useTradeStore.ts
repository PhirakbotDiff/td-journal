import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import { rowToTrade, tradeToRow, TradeRow } from '../lib/tradeMapper'
import { Trade, NewTradeInput } from '../lib/types'
import { useAccountStore } from './useAccountStore'

interface TradeStore {
  trades: Trade[]
  loading: boolean
  fetchTrades: (accountId: string) => Promise<void>
  addTrade: (input: NewTradeInput) => Promise<string | null>
  updateTrade: (id: string, patch: Partial<Trade>) => Promise<string | null>
  deleteTrade: (id: string) => Promise<string | null>
  closeTrade: (id: string, exitPrice: number, exitDate: string) => Promise<string | null>
  setCurrentPrice: (id: string, price: number) => Promise<string | null>
  importTrades: (trades: Trade[]) => Promise<string | null>
  reset: () => void
}

export const useTradeStore = create<TradeStore>((set, get) => ({
  trades: [],
  loading: false,

  fetchTrades: async (accountId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('account_id', accountId)
      .order('entry_date', { ascending: false })
    if (error) {
      console.error('fetchTrades failed:', error.message)
      set({ loading: false })
      return
    }
    set({ trades: (data as TradeRow[]).map(rowToTrade), loading: false })
  },

  addTrade: async (input) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const accountId = useAccountStore.getState().currentAccountId
    if (!accountId) return 'No account selected'
    const { data, error } = await supabase
      .from('trades')
      .insert(tradeToRow(input, user.id, accountId))
      .select()
      .single()
    if (error) return error.message
    set((state) => ({ trades: [rowToTrade(data as TradeRow), ...state.trades] }))
    return null
  },

  updateTrade: async (id, patch) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const accountId = useAccountStore.getState().currentAccountId
    if (!accountId) return 'No account selected'
    const { data, error } = await supabase
      .from('trades')
      .update(tradeToRow(patch, user.id, accountId))
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    const updated = rowToTrade(data as TradeRow)
    set((state) => ({ trades: state.trades.map((t) => (t.id === id ? updated : t)) }))
    return null
  },

  deleteTrade: async (id) => {
    const { error } = await supabase.from('trades').delete().eq('id', id)
    if (error) return error.message
    set((state) => ({ trades: state.trades.filter((t) => t.id !== id) }))
    return null
  },

  closeTrade: async (id, exitPrice, exitDate) => get().updateTrade(id, { exitPrice, exitDate }),

  setCurrentPrice: async (id, price) => get().updateTrade(id, { currentPrice: price }),

  importTrades: async (trades) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const accountId = useAccountStore.getState().currentAccountId
    if (!accountId) return 'No account selected'
    const rows = trades.map((t) => ({ ...tradeToRow(t, user.id, accountId), id: t.id }))
    const { error } = await supabase.from('trades').upsert(rows, { onConflict: 'id' })
    if (error) return error.message
    await get().fetchTrades(accountId)
    return null
  },

  reset: () => set({ trades: [], loading: false }),
}))
