import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import { rowToAccount, accountToRow, AccountRow } from '../lib/accountMapper'
import { Account, NewAccountInput } from '../lib/types'

const defaultAccount: Account = {
  id: '',
  name: 'Account',
  kind: 'fund',
  currency: 'USD',
  startingCapital: 10000,
  riskPerTradePercent: 1,
}

function lastAccountKey(userId: string): string {
  return `tj.lastAccountId.${userId}`
}

interface AccountStore {
  accounts: Account[]
  currentAccountId: string | null
  currentAccount: Account
  loading: boolean
  error: string | null
  fetchAccounts: () => Promise<void>
  setCurrentAccount: (id: string) => void
  addAccount: (input: NewAccountInput) => Promise<string | null>
  updateAccount: (id: string, patch: Partial<NewAccountInput>) => Promise<string | null>
  deleteAccount: (id: string) => Promise<string | null>
  reset: () => void
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  accounts: [],
  currentAccountId: null,
  currentAccount: defaultAccount,
  loading: false,
  error: null,

  fetchAccounts: async () => {
    set({ loading: true, error: null })
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      set({ loading: false })
      return
    }

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('fetchAccounts failed:', error.message)
      set({ loading: false, error: error.message })
      return
    }

    let accounts = (data as AccountRow[]).map(rowToAccount)

    if (accounts.length === 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('accounts')
        .insert(accountToRow({ ...defaultAccount, name: 'Default Account' }, user.id))
        .select()
        .single()
      if (insertError) {
        console.error('creating default account failed:', insertError.message)
        set({ loading: false, error: insertError.message })
        return
      }
      accounts = [rowToAccount(inserted as AccountRow)]
    }

    const savedId = localStorage.getItem(lastAccountKey(user.id))
    const selected = accounts.find((a) => a.id === savedId) ?? accounts[0]

    set({ accounts, currentAccountId: selected.id, currentAccount: selected, loading: false, error: null })
  },

  setCurrentAccount: (id) => {
    const account = get().accounts.find((a) => a.id === id)
    if (!account) return
    set({ currentAccountId: id, currentAccount: account })
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) localStorage.setItem(lastAccountKey(user.id), id)
    })
  },

  addAccount: async (input) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { data, error } = await supabase
      .from('accounts')
      .insert(accountToRow(input, user.id))
      .select()
      .single()
    if (error) return error.message
    const account = rowToAccount(data as AccountRow)
    set((state) => ({ accounts: [...state.accounts, account] }))
    return null
  },

  updateAccount: async (id, patch) => {
    const { data, error } = await supabase
      .from('accounts')
      .update(accountToRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    const updated = rowToAccount(data as AccountRow)
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === id ? updated : a)),
      currentAccount: state.currentAccountId === id ? updated : state.currentAccount,
    }))
    return null
  },

  deleteAccount: async (id) => {
    const { accounts, currentAccountId } = get()
    if (accounts.length <= 1) return 'At least one account is required'
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) return error.message

    const remaining = accounts.filter((a) => a.id !== id)
    if (currentAccountId !== id) {
      set({ accounts: remaining })
      return null
    }

    const next = remaining[0]
    set({ accounts: remaining, currentAccountId: next.id, currentAccount: next })
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) localStorage.setItem(lastAccountKey(user.id), next.id)
    return null
  },

  reset: () =>
    set({
      accounts: [],
      currentAccountId: null,
      currentAccount: defaultAccount,
      loading: false,
      error: null,
    }),
}))
